"""R05 — Transaction Burst (sliding 30-minute window).

For each customer, compute the historical distribution of 30-minute
transaction counts using a two-pointer sliding window: for each
transaction i (window start), count txs in [t_i, t_i + 30min).
From those counts: mean, stdev (pstdev), max.

Threshold (deterministic):
  threshold = max(5, ceil(mean + 3*std))
Fallback when std is zero/unusable:
  threshold = max(5, historical_max + 1)  # requires a strictly larger
  burst than anything seen; with std==0 and max<5 this yields no finding,
  which correctly reflects "no measurable deviation".

A finding is emitted for each maximal non-overlapping burst window with
count >= threshold (greedy earliest-first, skip windows overlapping an
already-emitted burst).

Severity: count >= threshold+3 → HIGH, >= threshold+1 → MEDIUM,
== threshold → LOW.
"""

import math
import statistics
from datetime import datetime, timedelta

RULE_ID = "R05"
RULE_NAME = "Transaction Burst"
DESCRIPTION = (
    "Detects an unusually high number of transactions within a short "
    "30-minute period compared with the customer's normal frequency."
)


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def _window_counts(times: list, window: timedelta) -> list:
    counts = []
    n = len(times)
    j = 0
    for i in range(n):
        if j < i:
            j = i
        while j < n and times[j] - times[i] <= window:
            j += 1
        counts.append(j - i)
    return counts


def evaluate(customer_id: str, transactions: list, baseline: dict,
             payee_baseline: dict | None = None, config=None) -> list:
    from backend.config import settings as default_settings
    cfg = config or default_settings
    window_min = int(getattr(cfg, "R05_WINDOW_MINUTES", 30))
    floor = int(getattr(cfg, "R05_MIN_TRANSACTION_FLOOR", 5))
    window = timedelta(minutes=window_min)

    txs = sorted(transactions, key=lambda x: x.get("timestamp", ""))
    if len(txs) < floor:
        # Still compute; small histories cannot burst (need >= floor).
        pass
    times = [_parse(t["timestamp"]) for t in txs]
    counts = _window_counts(times, window) if times else []
    if not counts:
        return []
    mean = statistics.fmean(counts)
    std = statistics.pstdev(counts) if len(counts) > 1 else 0.0
    hist_max = max(counts)
    if std > 1e-9:
        threshold = max(floor, math.ceil(mean + 3 * std))
        method = "mean_plus_3std"
    else:
        threshold = max(floor, hist_max + 1)
        method = "max_plus_one_fallback"

    findings = []
    n = len(txs)
    i = 0
    while i < n:
        # Count window starting at i.
        j = i
        while j < n and times[j] - times[i] <= window:
            j += 1
        count = j - i
        if count >= threshold:
            window_txs = txs[i:j]
            if count - threshold >= 3:
                sev = "HIGH"
            elif count - threshold >= 1:
                sev = "MEDIUM"
            else:
                sev = "LOW"
            findings.append({
                "customer_id": customer_id, "rule_id": RULE_ID, "rule_name": RULE_NAME,
                "severity": sev, "transaction_ids": [x["transaction_id"] for x in window_txs],
                "detected_at": window_txs[-1]["timestamp"],
                "summary": (f"Burst of {count} transactions within {window_min} minutes "
                            f"(threshold {threshold})."),
                "evidence": {"transaction_ids": [x["transaction_id"] for x in window_txs],
                             "start": window_txs[0]["timestamp"],
                             "end": window_txs[-1]["timestamp"],
                             "transaction_count": count,
                             "threshold": threshold,
                             "historical_mean_30min": round(mean, 3),
                             "historical_std_30min": round(std, 3),
                             "historical_max_30min": hist_max},
                "baseline": {"metric": "30min_window_count_distribution",
                             "value": {"mean": round(mean, 3), "std": round(std, 3),
                                       "max": hist_max}},
                "calculation": {"formula": f"max({floor}, ceil(mean + 3*std))",
                                "result": count, "threshold": threshold,
                                "method": method},
                "traceability": {"source": "data/transactions.csv",
                                 "transaction_ids": [x["transaction_id"] for x in window_txs]},
            })
            i = j  # skip overlapping windows (maximal non-overlapping bursts)
        else:
            i += 1
    return findings
