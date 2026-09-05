"""R02 — New Payee Burst.

A payee is NEW relative to the customer's own history: it has no
transaction strictly before the burst window under evaluation.
Triggers when: a new payee has >= R02_MIN_TRANSACTIONS (3) transactions
within R02_WINDOW_MINUTES (15) minutes.

Historical ordering matters: first_seen is derived from the sorted
customer history, and a burst only counts when its window starts at or
before the payee's first-ever transaction (i.e. the burst IS the first
appearance). Checking the full-dataset payee list alone is NOT enough.

Severity (deterministic): count >= 5 → HIGH, == 4 → MEDIUM, == 3 → LOW.
"""

from datetime import datetime, timedelta

RULE_ID = "R02"
RULE_NAME = "New Payee Burst"
DESCRIPTION = (
    "Detects a burst of transactions to a payee newly observed for that "
    "customer: at least 3 transactions within a 15-minute window starting "
    "at the payee's first appearance."
)


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def _severity(count: int) -> str:
    if count >= 5:
        return "HIGH"
    if count == 4:
        return "MEDIUM"
    return "LOW"


def evaluate(customer_id: str, transactions: list, baseline: dict,
             payee_baseline: dict | None = None, config=None) -> list:
    from backend.config import settings as default_settings
    cfg = config or default_settings
    window_min = int(getattr(cfg, "R02_WINDOW_MINUTES", 15))
    min_tx = int(getattr(cfg, "R02_MIN_TRANSACTIONS", 3))
    window = timedelta(minutes=window_min)

    # Group by payee, sorted.
    by_payee: dict = {}
    for t in transactions:
        by_payee.setdefault(t.get("payee", ""), []).append(t)
    for payee in by_payee:
        by_payee[payee].sort(key=lambda x: x.get("timestamp", ""))

    # Customer's overall first-seen per payee (ordering baseline).
    first_seen: dict = {}
    for payee, txs in by_payee.items():
        first_seen[payee] = _parse(txs[0]["timestamp"])

    findings = []
    for payee in sorted(by_payee):
        txs = by_payee[payee]
        if len(txs) < min_tx:
            continue
        # Sliding window over this payee's transactions.
        emitted_windows: list = []
        n = len(txs)
        i = 0
        while i < n:
            start = _parse(txs[i]["timestamp"])
            # Only consider windows that include the first-ever appearance
            # (new payee): window must start at or before first_seen and the
            # first transaction in window must be the first_seen one.
            # Since txs sorted, this means i must be 0 for a "new" burst...
            # but we keep the general check for clarity with synthetic tests
            # where history may be passed separately via payee_baseline.
            j = i
            while j < n and _parse(txs[j]["timestamp"]) - start <= window:
                j += 1
            count = j - i
            if count >= min_tx:
                window_txs = txs[i:j]
                window_start = _parse(window_txs[0]["timestamp"])
                # New-payee check: no transaction for this payee strictly
                # before the window start in the customer's history.
                is_new = window_start <= first_seen[payee]
                # Cross-check with Phase 1 payee baseline when available:
                # if baseline says first_seen is earlier than window, not new.
                if payee_baseline and payee in payee_baseline:
                    try:
                        base_first = _parse(payee_baseline[payee]["first_seen"])
                        if base_first < window_start:
                            is_new = False
                    except (ValueError, KeyError, TypeError):
                        pass
                if is_new:
                    # Avoid duplicate overlapping windows for same payee:
                    # emit only the earliest window that satisfies the burst.
                    if not emitted_windows:
                        amounts = [float(x["amount"]) for x in window_txs]
                        findings.append({
                            "customer_id": customer_id,
                            "rule_id": RULE_ID,
                            "rule_name": RULE_NAME,
                            "severity": _severity(count),
                            "transaction_ids": [x["transaction_id"] for x in window_txs],
                            "detected_at": window_txs[-1]["timestamp"],
                            "summary": (
                                f"Burst of {count} transactions to newly observed payee "
                                f"'{payee}' within {window_min} minutes."
                            ),
                            "evidence": {
                                "payee": payee,
                                "transaction_ids": [x["transaction_id"] for x in window_txs],
                                "timestamps": [x["timestamp"] for x in window_txs],
                                "amounts": amounts,
                                "transaction_count": count,
                                "window_minutes": window_min,
                                "window_start": window_txs[0]["timestamp"],
                                "window_end": window_txs[-1]["timestamp"],
                                "previous_payee_history": 0,
                                "first_observed": window_txs[0]["timestamp"],
                            },
                            "baseline": {"metric": "payee_first_seen", "value": None,
                                         "known_payees": sorted(by_payee.keys())[:50]},
                            "calculation": {
                                "formula": f"count(payee txs in [t, t+{window_min}min]) >= {min_tx} AND no prior history",
                                "result": count, "threshold": min_tx,
                            },
                            "traceability": {
                                "source": "data/transactions.csv",
                                "transaction_ids": [x["transaction_id"] for x in window_txs],
                            },
                        })
                        emitted_windows.append((window_start, count))
                    break  # one finding per new payee (earliest burst)
            i += 1
    # Deterministic order.
    findings.sort(key=lambda f: (f["evidence"]["window_start"], f["evidence"]["payee"]))
    return findings
