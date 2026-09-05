"""Phase 2 — deterministic risk-detection engine (no LLM).

Pipeline: Data Loader → Customer Baseline → R01..R05 → Findings.
Every rule is independent: a transaction may trigger several rules and
all findings are preserved. IDs are deterministic (sorted execution +
sequential F0001...), so repeated runs produce identical output.
"""

from collections import defaultdict

from backend.services.rules import REGISTRY, RULE_IDS

ENGINE_VERSION = "1.0"
FINDINGS_SOURCE = "data/transactions.csv"


def run_customer(customer_id: str, transactions: list, baseline: dict,
                 payee_baseline: dict | None = None,
                 rule_ids: list | None = None, config=None) -> list:
    """Run selected rules for one customer; returns findings (no IDs yet)."""
    rule_ids = rule_ids or RULE_IDS
    out = []
    for rid in RULE_IDS:
        if rid not in rule_ids:
            continue
        module = REGISTRY.get(rid)
        if module is None:
            continue
        out.extend(module.evaluate(customer_id, transactions, baseline or {},
                                   payee_baseline or {}, config))
    return out


def run_engine(transactions: list, baselines: dict, payee_baselines: dict,
               rule_ids: list | None = None, config=None) -> list:
    """Run all rules over all customers; assigns deterministic finding_ids."""
    grouped: dict = defaultdict(list)
    for t in transactions:
        grouped[t.get("customer_id")].append(t)

    raw: list = []
    for cid in sorted(grouped):
        txs = sorted(grouped[cid], key=lambda x: x.get("timestamp", ""))
        baseline = (baselines or {}).get(cid, {})
        payee_base = (payee_baselines or {}).get(cid, {})
        raw.extend(run_customer(cid, txs, baseline, payee_base, rule_ids, config))

    # Deterministic global order: (customer, rule, detected_at, first tx id).
    raw.sort(key=lambda f: (f.get("customer_id", ""),
                            f.get("rule_id", ""),
                            f.get("detected_at", ""),
                            (f.get("transaction_ids") or [""])[0]))
    findings = []
    for idx, f in enumerate(raw, start=1):
        f = dict(f)
        f["finding_id"] = f"F{idx:04d}"
        findings.append(f)
    return findings


def build_findings_document(transactions: list, baselines: dict,
                            payee_baselines: dict, findings: list,
                            rule_ids: list | None = None) -> dict:
    return {
        "generated_from": FINDINGS_SOURCE,
        "engine_version": ENGINE_VERSION,
        "rules": rule_ids or RULE_IDS,
        "transactions_analysed": len(transactions),
        "findings": findings,
    }
