"""Run the deterministic Phase 2 risk engine.

Usage:
    python scripts/run_risk_engine.py [--rule R01]

Loads data/transactions.csv + baselines, runs R01–R05 (or one rule),
validates findings, writes data/findings.json, prints a summary.
No LLM, no network, no randomness.
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.services import data_loader
from backend.services.finding_validation import validate_findings
from backend.services.risk_engine import build_findings_document, run_engine
from backend.services.rules import RULE_IDS

BASE_DIR = Path(__file__).resolve().parents[1]
FINDINGS_PATH = BASE_DIR / "data" / "findings.json"


def main() -> int:
    parser = argparse.ArgumentParser(description="Run RiskLens AI risk engine")
    parser.add_argument("--rule", choices=RULE_IDS, default=None,
                        help="Run a single rule (default: all)")
    args = parser.parse_args()

    transactions = data_loader.load_transactions()
    customers = data_loader.load_customers()
    baselines = data_loader.load_customer_baselines()
    payee_baselines = data_loader.load_payee_baselines()
    rule_ids = [args.rule] if args.rule else RULE_IDS

    findings = run_engine(transactions, baselines, payee_baselines, rule_ids)
    doc = build_findings_document(transactions, baselines, payee_baselines,
                                  findings, rule_ids)
    with open(FINDINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=2)

    result = validate_findings(findings, transactions, customers)
    counts = Counter(f["rule_id"] for f in findings)

    print("Risk Engine Complete")
    print(f"Transactions analysed: {len(transactions)}")
    for rid in RULE_IDS:
        print(f"{rid} findings: {counts.get(rid, 0)}")
    print(f"Total findings: {len(findings)}")
    print(f"Validation: valid={result['valid']} errors={len(result['errors'])}")
    for e in result["errors"][:10]:
        print("ERROR:", e)
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
