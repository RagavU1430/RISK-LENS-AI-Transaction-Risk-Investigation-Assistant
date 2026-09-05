"""Phase 3 — deterministic evidence & investigation-context engine (no LLM).

Enriches Phase 2 findings with exact transactions, surrounding activity,
customer/payee/temporal context, baseline comparisons and traceability.
Phase 2 findings are authoritative: this layer never re-decides rules,
never invents data — every value comes from the source dataset, the
Phase 1 baselines, or the Phase 2 finding itself.
"""

from datetime import datetime, timedelta

ENGINE_VERSION = "1.0"
RELATED_WINDOW_HOURS = 24
MAX_RELATED = 20

TX_FIELDS = ["transaction_id", "customer_id", "timestamp", "date", "time",
             "description", "payee", "amount", "channel", "transaction_type"]

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
            "Saturday", "Sunday"]


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def _slim(tx: dict) -> dict:
    return {k: tx.get(k) for k in TX_FIELDS}


def _bucket(hour: int) -> str:
    if 6 <= hour < 10:
        return "06:00-10:00"
    if 10 <= hour < 14:
        return "10:00-14:00"
    if 14 <= hour < 18:
        return "14:00-18:00"
    if 18 <= hour < 22:
        return "18:00-22:00"
    return "22:00-06:00"


class _Index:
    """Per-build indexes so evidence generation is a single pass per customer."""

    def __init__(self, transactions: list, baselines: dict,
                 payee_baselines: dict, customers: list):
        self.by_id = {t.get("transaction_id"): t for t in transactions}
        self.by_customer: dict = {}
        for t in transactions:
            self.by_customer.setdefault(t.get("customer_id"), []).append(t)
        for txs in self.by_customer.values():
            txs.sort(key=lambda x: x.get("timestamp", ""))
        self.baselines = baselines or {}
        self.payee_baselines = payee_baselines or {}
        self.profiles = {c.get("customer_id"): c for c in (customers or [])}


def build_evidence_for_finding(finding: dict, transactions: list,
                               customer_baseline: dict,
                               payee_baseline: dict,
                               customer_profile: dict | None = None) -> dict:
    """Enrich ONE finding. `transactions` may be the full dataset or just
    the customer's history; filtering is done internally (deterministic)."""
    cid = finding.get("customer_id")
    idx = _Index(transactions, {cid: customer_baseline or {}},
                 {cid: payee_baseline or {}},
                 [customer_profile] if customer_profile else [])
    return _enrich(finding, idx)


def build_all_evidence(findings: list, transactions: list, baselines: dict,
                       payee_baselines: dict, customers: list) -> list:
    idx = _Index(transactions, baselines, payee_baselines, customers)
    packages = [_enrich(f, idx) for f in
                sorted(findings, key=lambda x: x.get("finding_id", ""))]
    return packages


def build_investigation_contexts(findings: list, packages: list,
                                 customers: list) -> list:
    profiles = {c.get("customer_id"): c for c in (customers or [])}
    by_finding = {p.get("finding_id"): p for p in packages}
    by_id = {f.get("finding_id"): f for f in findings}
    contexts = []
    for fid in sorted(by_id):
        f = by_id[fid]
        contexts.append({
            "investigation_id": f"INV-{fid}",
            "customer_id": f.get("customer_id"),
            "finding_ids": [fid],
            "findings": [f],
            "evidence_packages": [by_finding[fid]] if fid in by_finding else [],
            "customer_profile": profiles.get(f.get("customer_id"), {}),
            "source": {
                "transactions": "data/transactions.csv",
                "customer_baseline": "data/customer_baselines.json",
                "payee_baseline": "data/payee_baselines.json",
                "findings": "data/findings.json",
            },
        })
    return contexts


def _enrich(finding: dict, idx: _Index) -> dict:
    cid = finding.get("customer_id")
    rule_id = finding.get("rule_id")
    tids = list(finding.get("transaction_ids") or [])
    primaries = [_slim(idx.by_id[tid]) for tid in tids if tid in idx.by_id]
    cust_txs = idx.by_customer.get(cid, [])
    baseline = idx.baselines.get(cid, {})
    payee_base = idx.payee_baselines.get(cid, {})
    profile = idx.profiles.get(cid, {})

    anchor_ts = min([p["timestamp"] for p in primaries]) if primaries else finding.get("detected_at")
    primary_payees = sorted({p.get("payee", "") for p in primaries})

    related = _related(primaries, cust_txs, anchor_ts)
    return {
        "finding_id": finding.get("finding_id"),
        "customer_id": cid,
        "rule_id": rule_id,
        "primary_transactions": primaries,
        "related_transactions": related,
        "customer_context": _customer_context(cid, profile, baseline),
        "payee_context": _payee_context(primaries, cust_txs, payee_base, anchor_ts),
        "temporal_context": _temporal_context(primaries, cust_txs, baseline, anchor_ts,
                                              primary_payees),
        "baseline_comparison": _baseline_comparison(finding),
        "calculation": {**(finding.get("calculation") or {}), "triggered": True},
        "source_traceability": {
            "transaction_source": "data/transactions.csv",
            "customer_baseline_source": "data/customer_baselines.json",
            "payee_baseline_source": "data/payee_baselines.json",
            "transaction_ids": tids,
            "customer_id": cid,
            "rule_id": rule_id,
            "finding_id": finding.get("finding_id"),
        },
    }


def _related(primaries: list, cust_txs: list, anchor_ts: str | None) -> list:
    if not anchor_ts:
        return []
    primary_ids = {p.get("transaction_id") for p in primaries}
    primary_payees = {p.get("payee") for p in primaries}
    anchor = _parse(anchor_ts)
    window = timedelta(hours=RELATED_WINDOW_HOURS)
    scored = []
    for t in cust_txs:
        if t.get("transaction_id") in primary_ids:
            continue
        try:
            diff = abs((_parse(t["timestamp"]) - anchor).total_seconds())
        except ValueError:
            continue
        if diff > window.total_seconds():
            continue
        scored.append(((0 if t.get("payee") in primary_payees else 1,
                        diff, t.get("timestamp", ""), t.get("transaction_id", "")), t))
    scored.sort(key=lambda x: x[0])
    return [_slim(t) for _, t in scored[:MAX_RELATED]]


def _customer_context(cid: str, profile: dict, baseline: dict) -> dict:
    baseline = baseline or {}
    return {
        "customer_id": cid,
        "customer_name": (profile or {}).get("customer_name"),
        "customer_type": (profile or {}).get("customer_type"),
        "primary_channel": (profile or {}).get("primary_channel"),
        "total_transactions": baseline.get("total_transactions"),
        "average_amount": baseline.get("average_amount"),
        "median_amount": baseline.get("median_amount"),
        "standard_deviation": baseline.get("standard_deviation"),
        "typical_transaction_count_per_day": baseline.get("typical_transaction_count_per_day"),
        "average_daily_amount": baseline.get("average_daily_amount"),
        "normal_channels": baseline.get("most_common_channels", []),
        "normal_payees": baseline.get("most_common_payees", []),
        "normal_transaction_types": baseline.get("most_common_transaction_types", []),
        "time_distribution": baseline.get("time_distribution", {}),
        "typical_transaction_hour": baseline.get("typical_transaction_hour"),
        "median_transaction_hour": baseline.get("median_transaction_hour"),
        "monthly_transaction_count": baseline.get("monthly_transaction_count", {}),
        "monthly_total_amount": baseline.get("monthly_total_amount", {}),
    }


def _payee_context(primaries: list, cust_txs: list, payee_base: dict,
                   anchor_ts: str | None) -> dict:
    # Chronological correctness: known_before uses only history strictly
    # before the finding anchor — never future transactions.
    per_payee: dict = {}
    for p in primaries:
        name = p.get("payee", "")
        if name in per_payee:
            continue
        history = sorted([t for t in cust_txs if t.get("payee") == name],
                         key=lambda x: x.get("timestamp", ""))
        amounts = [float(t["amount"]) for t in history]
        first_overall = history[0]["timestamp"] if history else p.get("timestamp")
        if not first_overall:
            first_overall = anchor_ts
        if anchor_ts and first_overall and first_overall < anchor_ts:
            known_before, first_seen = True, first_overall
        elif anchor_ts:
            later = sorted(t["timestamp"] for t in history if t.get("timestamp", "") >= anchor_ts)
            known_before, first_seen = False, (later[0] if later else first_overall)
        else:
            known_before, first_seen = False, first_overall
        base_entry = (payee_base or {}).get(name, {})
        per_payee[name] = {
            "payee": name,
            "known_before_finding": known_before,
            "first_seen": first_seen,
            "last_seen": history[-1]["timestamp"] if history else None,
            "historical_transaction_count": len(history),
            "historical_total_amount": round(sum(amounts), 2),
            "historical_average_amount": round(sum(amounts) / len(amounts), 2) if amounts else 0.0,
            "baseline_first_seen": base_entry.get("first_seen"),
            "baseline_last_seen": base_entry.get("last_seen"),
        }
    primary_payee = None
    if primaries:
        from collections import Counter
        primary_payee = Counter(p.get("payee") for p in primaries).most_common(1)[0][0]
    return {"payees": per_payee, "primary_payee": primary_payee}


def _temporal_context(primaries: list, cust_txs: list, baseline: dict,
                      anchor_ts: str | None, primary_payees: list) -> dict:
    if not anchor_ts:
        return {}
    anchor = _parse(anchor_ts)
    window = timedelta(hours=RELATED_WINDOW_HOURS)
    nearby = []
    for t in cust_txs:
        try:
            if abs((_parse(t["timestamp"]) - anchor).total_seconds()) <= window.total_seconds():
                nearby.append(t["timestamp"])
        except ValueError:
            continue
    nearby.sort()
    time_dist = (baseline or {}).get("time_distribution", {})
    bucket = _bucket(anchor.hour)
    return {
        "anchor_timestamp": anchor_ts,
        "date": anchor.strftime("%Y-%m-%d"),
        "time": anchor.strftime("%H:%M:%S"),
        "hour": anchor.hour,
        "day_of_week": WEEKDAYS[anchor.weekday()],
        "weekday_weekend": "weekend" if anchor.weekday() >= 5 else "weekday",
        "typical_transaction_hour": (baseline or {}).get("typical_transaction_hour"),
        "median_transaction_hour": (baseline or {}).get("median_transaction_hour"),
        "time_distribution": time_dist,
        "anchor_bucket": bucket,
        "anchor_bucket_pct": time_dist.get(bucket),
        "nearby_24h_count": len(nearby),
        "nearby_timestamps": nearby[:MAX_RELATED],
        "primary_payees": primary_payees,
    }


def _baseline_comparison(finding: dict) -> dict:
    """Mirror the Phase 2 calculation (authoritative) with observed-vs-baseline
    framing. No thresholds are changed here."""
    ev = finding.get("evidence") or {}
    calc = finding.get("calculation") or {}
    rule_id = finding.get("rule_id")
    if rule_id == "R01":
        observed, base = ev.get("amount"), ev.get("customer_median")
        return {"observed": observed, "baseline": base,
                "difference": round(observed - base, 2) if isinstance(observed, (int, float)) and isinstance(base, (int, float)) else None,
                "ratio": ev.get("ratio"), "threshold": ev.get("threshold"),
                "rule_result": "TRIGGERED"}
    if rule_id == "R02":
        return {"observed": ev.get("transaction_count"), "baseline": 0,
                "threshold": ev.get("threshold", calc.get("threshold", 3)),
                "window_minutes": ev.get("window_minutes"),
                "payee": ev.get("payee"), "rule_result": "TRIGGERED"}
    if rule_id == "R03":
        return {"observed_hour": ev.get("hour"), "window": ev.get("overnight_window"),
                "baseline_overnight_pct": ev.get("customer_overnight_pct"),
                "time_distribution": ev.get("customer_time_distribution"),
                "rule_result": "TRIGGERED"}
    if rule_id == "R04":
        method = calc.get("method", "z_score")
        observed = ev.get("amount")
        if method == "z_score":
            return {"observed": observed, "baseline_mean": ev.get("customer_mean"),
                    "baseline_stddev": ev.get("customer_stddev"),
                    "deviation": ev.get("z_score"), "threshold": ev.get("threshold"),
                    "method": method, "rule_result": "TRIGGERED"}
        return {"observed": observed, "baseline": ev.get("customer_median", ev.get("customer_mean")),
                "deviation": ev.get("modified_z", ev.get("ratio")),
                "threshold": ev.get("threshold"), "method": method,
                "rule_result": "TRIGGERED"}
    if rule_id == "R05":
        return {"observed_count": ev.get("transaction_count"),
                "baseline_mean": ev.get("historical_mean_30min"),
                "baseline_std": ev.get("historical_std_30min"),
                "baseline_max": ev.get("historical_max_30min"),
                "threshold": ev.get("threshold"), "rule_result": "TRIGGERED"}
    return {"observed": ev, "baseline": finding.get("baseline"),
            "threshold": calc.get("threshold"), "rule_result": "TRIGGERED"}
