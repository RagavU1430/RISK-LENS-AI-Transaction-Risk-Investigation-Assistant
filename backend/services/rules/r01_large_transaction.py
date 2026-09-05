"""R01 — Unusually Large Transaction.

Triggers when: amount > R01_MULTIPLIER (5.0) × customer historical median.
Exactly 5× does NOT trigger (strictly greater).
Deterministic severity: ratio >= 10 → HIGH, >= 7 → MEDIUM, else LOW.
Wording is observational only; never states fraud occurred.
"""

RULE_ID = "R01"
RULE_NAME = "Unusually Large Transaction"
DESCRIPTION = (
    "Detects a transaction whose amount is unusually large compared with "
    "the customer's established median transaction amount."
)


def _severity(ratio: float) -> str:
    if ratio >= 10:
        return "HIGH"
    if ratio >= 7:
        return "MEDIUM"
    return "LOW"


def evaluate(customer_id: str, transactions: list, baseline: dict,
             payee_baseline: dict | None = None, config=None) -> list:
    from backend.config import settings as default_settings
    cfg = config or default_settings
    multiplier = float(getattr(cfg, "R01_MULTIPLIER", 5.0))

    median = float((baseline or {}).get("median_amount", 0) or 0)
    if median <= 0:
        return []
    threshold = multiplier * median
    findings = []
    for t in sorted(transactions, key=lambda x: x.get("timestamp", "")):
        try:
            amount = float(t["amount"])
        except (TypeError, ValueError):
            continue
        if amount > threshold:
            ratio = round(amount / median, 2)
            findings.append({
                "customer_id": customer_id,
                "rule_id": RULE_ID,
                "rule_name": RULE_NAME,
                "severity": _severity(ratio),
                "transaction_ids": [t["transaction_id"]],
                "detected_at": t["timestamp"],
                "summary": "Unusually large transaction compared with the customer's historical transaction size.",
                "evidence": {
                    "transaction_id": t["transaction_id"],
                    "amount": amount,
                    "customer_median": median,
                    "ratio": ratio,
                    "threshold": round(threshold, 2),
                    "customer_id": customer_id,
                    "timestamp": t["timestamp"],
                    "payee": t.get("payee"),
                    "channel": t.get("channel"),
                },
                "baseline": {"metric": "median_transaction_amount", "value": median},
                "calculation": {"formula": "amount / customer_median", "result": ratio,
                                "threshold": round(threshold, 2), "multiplier": multiplier},
                "traceability": {"source": "data/transactions.csv",
                                 "transaction_ids": [t["transaction_id"]]},
            })
    return findings
