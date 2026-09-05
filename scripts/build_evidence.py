"""Build deterministic Phase 3 evidence + investigation contexts.

Usage:
    python scripts/build_evidence.py

Reads data/findings.json (+ Phase 1 datasets), writes data/evidence.json
and data/investigation_context.json, validates, prints a summary.
No LLM, no network, no randomness. Never modifies findings.json.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.services import data_loader
from backend.services.evidence_engine import (
    ENGINE_VERSION,
    build_all_evidence,
    build_investigation_contexts,
)
from backend.services.evidence_validation import validate_evidence

BASE_DIR = Path(__file__).resolve().parents[1]
EVIDENCE_PATH = BASE_DIR / "data" / "evidence.json"
CONTEXT_PATH = BASE_DIR / "data" / "investigation_context.json"


def main() -> int:
    transactions = data_loader.load_transactions()
    customers = data_loader.load_customers()
    baselines = data_loader.load_customer_baselines()
    payee_baselines = data_loader.load_payee_baselines()
    findings_doc = data_loader.load_findings()
    findings = findings_doc.get("findings", [])

    packages = build_all_evidence(findings, transactions, baselines,
                                  payee_baselines, customers)
    with open(EVIDENCE_PATH, "w", encoding="utf-8") as f:
        json.dump({"engine_version": ENGINE_VERSION,
                   "generated_from": "data/findings.json",
                   "evidence_packages": packages}, f, indent=2)

    contexts = build_investigation_contexts(findings, packages, customers)
    with open(CONTEXT_PATH, "w", encoding="utf-8") as f:
        json.dump({"engine_version": ENGINE_VERSION,
                   "generated_from": "data/evidence.json",
                   "investigations": contexts}, f, indent=2)

    result = validate_evidence(packages, findings, transactions, customers)
    print("Evidence Engine Complete")
    print(f"Findings processed: {len(findings)}")
    print(f"Evidence packages: {len(packages)}")
    print(f"Investigation contexts: {len(contexts)}")
    print(f"Validation: valid={result['valid']} errors={len(result['errors'])} "
          f"warnings={len(result['warnings'])}")
    for e in result["errors"][:10]:
        print("ERROR:", e)
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
