"""R03 — Odd-Hours Activity.

Overnight window: [R03_START_HOUR, R03_END_HOUR) = [0, 5).
Each transaction in that window triggers a finding, but the evidence
includes the customer's established time behaviour so a reviewer can
see whether overnight activity is normal for that customer.

Severity (deterministic, behaviour-aware):
  overnight_ratio < 2%  → HIGH (very unusual for this customer)
  overnight_ratio < 5%  → MEDIUM
  otherwise             → LOW (customer regularly transacts overnight)
"""

from datetime import datetime

RULE_ID = "R03"
RULE_NAME = "Odd-Hours Activity"
DESCRIPTION = (
    "Detects transactions occurring during overnight hours (00:00–05:00), "
    "with evidence showing the customer's historical time behaviour."
)


def _hour(ts: str) -> int:
    return datetime.fromisoformat(ts).hour


def _severity(overnight_ratio_pct: float) -> str:
    if overnight_ratio_pct < 2.0:
        return "HIGH"
    if overnight_ratio_pct < 5.0:
        return "MEDIUM"
    return "LOW"


def evaluate(customer_id: str, transactions: list, baseline: dict,
             payee_baseline: dict | None = None, config=None) -> list:
    from backend.config import settings as default_settings
    cfg = config or default_settings
    start_h = int(getattr(cfg, "R03_START_HOUR", 0))
    end_h = int(getattr(cfg, "R03_END_HOUR", 5))

    baseline = baseline or {}
    time_dist = baseline.get("time_distribution", {})

    # Customer overnight frequency from actual history (deterministic).
    total = len(transactions)
    overnight_all = [t for t in transactions
                     if start_h <= _hour(t["timestamp"]) < end_h]
    overnight_ratio = round(len(overnight_all) / total * 100, 2) if total else 0.0

    findings = []
    for t in sorted(overnight_all, key=lambda x: x.get("timestamp", "")):
        hour = _hour(t["timestamp"])
        findings.append({
            "customer_id": customer_id,
            "rule_id": RULE_ID,
            "rule_name": RULE_NAME,
            "severity": _severity(overnight_ratio),
            "transaction_ids": [t["transaction_id"]],
            "detected_at": t["timestamp"],
            "summary": (
                f"Transaction at {t['time']} falls in the overnight window "
                f"({start_h:02d}:00–{end_h:02d}:00)."
            ),
            "evidence": {
                "transaction_id": t["transaction_id"],
                "timestamp": t["timestamp"],
                "hour": hour,
                "overnight_window": f"{start_h:02d}:00-{end_h:02d}:00",
                "customer_overnight_count": len(overnight_all),
                "customer_overnight_pct": overnight_ratio,
                "customer_time_distribution": time_dist,
                "payee": t.get("payee"),
                "amount": float(t["amount"]),
                "channel": t.get("channel"),
            },
            "baseline": {"metric": "time_distribution", "value": time_dist,
                         "overnight_pct": overnight_ratio},
            "calculation": {"formula": f"hour in [{start_h}, {end_h})",
                            "result": hour, "threshold": f"{start_h:02d}:00-{end_h:02d}:00"},
            "traceability": {"source": "data/transactions.csv",
                             "transaction_ids": [t["transaction_id"]]},
        })
    return findings
