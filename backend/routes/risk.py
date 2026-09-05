"""Phase 2 — deterministic risk-findings API (no LLM)."""

import json
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Query

BASE_DIR = Path(__file__).resolve().parents[2]
FINDINGS_PATH = BASE_DIR / "data" / "findings.json"

router = APIRouter()


def _load_findings() -> dict:
    if not FINDINGS_PATH.exists():
        return {"generated_from": "data/transactions.csv", "engine_version": "1.0",
                "rules": ["R01", "R02", "R03", "R04", "R05"],
                "transactions_analysed": 0, "findings": []}
    with open(FINDINGS_PATH, encoding="utf-8") as f:
        return json.load(f)


@router.get("/risk/findings")
def list_findings(
    customer_id: Optional[str] = Query(default=None),
    rule_id: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None),
) -> dict:
    doc = _load_findings()
    findings: List[dict] = doc.get("findings", [])
    if customer_id:
        findings = [f for f in findings if f.get("customer_id") == customer_id]
    if rule_id:
        findings = [f for f in findings if f.get("rule_id") == rule_id]
    if severity:
        findings = [f for f in findings
                    if str(f.get("severity", "")).upper() == severity.upper()]
    return {**doc, "findings": findings, "total": len(findings)}


@router.get("/customers/{customer_id}/findings")
def customer_findings(customer_id: str) -> dict:
    doc = _load_findings()
    findings = [f for f in doc.get("findings", [])
                if f.get("customer_id") == customer_id]
    return {**doc, "findings": findings, "total": len(findings),
            "customer_id": customer_id}
