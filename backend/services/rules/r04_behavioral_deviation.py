"""R04 — Behavioural Deviation (z-score with MAD fallback).

Primary: z = (amount - customer_mean) / customer_stddev using Phase 1
baseline (average_amount, standard_deviation). Triggers when |z| >=
R04_Z_THRESHOLD (3.0).

Fallback (std zero/unusable): robust comparison with median + MAD
(median absolute deviation) computed from the customer's amounts:
  modified_z = 0.6745 * (x - median) / MAD, threshold 3.5.
If MAD is also zero: triggers when amount >= 3×median or <= median/3
(median > 0), documented as median_ratio_fallback. If amount == median,
no finding (no measurable deviation).

R04 is NOT a duplicate of R01: it uses mean/std (distribution shape),
not a fixed median multiplier, and flags both unusually high AND
unusually low amounts.

Severity (deterministic): |z| (or fallback deviation) >= 5 → HIGH,
>= 4 → MEDIUM, else LOW.
"""

import statistics

RULE_ID = "R04"
RULE_NAME = "Behavioural Deviation"
DESCRIPTION = (
    "Detects a transaction that materially deviates from the customer's "
    "established amount behaviour using z-score (MAD fallback)."
)


def _severity(dev: float) -> str:
    a = abs(dev)
    if a >= 5:
        return "HIGH"
    if a >= 4:
        return "MEDIUM"
    return "LOW"


def evaluate(customer_id: str, transactions: list, baseline: dict,
             payee_baseline: dict | None = None, config=None) -> list:
    from backend.config import settings as default_settings
    cfg = config or default_settings
    z_thresh = float(getattr(cfg, "R04_Z_THRESHOLD", 3.0))

    baseline = baseline or {}
    mean = float(baseline.get("average_amount", 0) or 0)
    std = float(baseline.get("standard_deviation", 0) or 0)
    median = float(baseline.get("median_amount", 0) or 0)
    use_std = std > 1e-9

    amounts = []
    for t in transactions:
        try:
            amounts.append(float(t["amount"]))
        except (TypeError, ValueError):
            pass
    mad = float(statistics.median([abs(a - median) for a in amounts])) if amounts and median else 0.0

    findings = []
    for t in sorted(transactions, key=lambda x: x.get("timestamp", "")):
        try:
            amount = float(t["amount"])
        except (TypeError, ValueError):
            continue
        if use_std:
            z = (amount - mean) / std
            if abs(z) < z_thresh:
                continue
            findings.append({
                "customer_id": customer_id, "rule_id": RULE_ID, "rule_name": RULE_NAME,
                "severity": _severity(z), "transaction_ids": [t["transaction_id"]],
                "detected_at": t["timestamp"],
                "summary": "Transaction amount deviates materially from the customer's established behaviour (z-score).",
                "evidence": {"transaction_id": t["transaction_id"], "amount": amount,
                             "customer_mean": mean, "customer_stddev": std,
                             "z_score": round(z, 3), "threshold": z_thresh,
                             "timestamp": t["timestamp"], "payee": t.get("payee"),
                             "channel": t.get("channel")},
                "baseline": {"metric": "average_amount/stddev",
                             "value": {"mean": mean, "stddev": std}},
                "calculation": {"formula": "(amount - mean) / stddev",
                                "result": round(z, 3), "threshold": z_thresh,
                                "method": "z_score"},
                "traceability": {"source": "data/transactions.csv",
                                 "transaction_ids": [t["transaction_id"]]},
            })
        else:
            # Robust fallback.
            if mad > 1e-9:
                mod_z = 0.6745 * (amount - median) / mad
                if abs(mod_z) < 3.5:
                    continue
                findings.append({
                    "customer_id": customer_id, "rule_id": RULE_ID, "rule_name": RULE_NAME,
                    "severity": _severity(mod_z), "transaction_ids": [t["transaction_id"]],
                    "detected_at": t["timestamp"],
                    "summary": "Transaction amount deviates from established behaviour (robust MAD comparison).",
                    "evidence": {"transaction_id": t["transaction_id"], "amount": amount,
                                 "customer_median": median, "mad": round(mad, 2),
                                 "modified_z": round(mod_z, 3), "threshold": 3.5,
                                 "timestamp": t["timestamp"]},
                    "baseline": {"metric": "median/mad",
                                 "value": {"median": median, "mad": round(mad, 2)}},
                    "calculation": {"formula": "0.6745*(amount-median)/MAD",
                                    "result": round(mod_z, 3), "threshold": 3.5,
                                    "method": "mad_fallback"},
                    "traceability": {"source": "data/transactions.csv",
                                     "transaction_ids": [t["transaction_id"]]},
                })
            else:
                if median <= 0 or amount == median:
                    continue
                ratio = amount / median
                if amount > median and ratio < 3:
                    continue
                if amount < median and ratio > 1 / 3:
                    continue
                dev = ratio if amount > median else -1 / ratio if ratio else 0
                findings.append({
                    "customer_id": customer_id, "rule_id": RULE_ID, "rule_name": RULE_NAME,
                    "severity": _severity(dev), "transaction_ids": [t["transaction_id"]],
                    "detected_at": t["timestamp"],
                    "summary": "Transaction amount deviates from established behaviour (median-ratio fallback).",
                    "evidence": {"transaction_id": t["transaction_id"], "amount": amount,
                                 "customer_median": median, "ratio": round(ratio, 3),
                                 "threshold": "3x median", "timestamp": t["timestamp"]},
                    "baseline": {"metric": "median_transaction_amount", "value": median},
                    "calculation": {"formula": "amount / median", "result": round(ratio, 3),
                                    "threshold": 3.0, "method": "median_ratio_fallback"},
                    "traceability": {"source": "data/transactions.csv",
                                     "transaction_ids": [t["transaction_id"]]},
                })
    return findings
