"""Phase 3 — deterministic evidence & investigation APIs (no LLM)."""

from functools import lru_cache
from typing import List, Optional

from fastapi import APIRouter, Query

from backend.services import data_loader

router = APIRouter()


@lru_cache(maxsize=1)
def _evidence_doc() -> dict:
    return data_loader.load_evidence()


@lru_cache(maxsize=1)
def _investigations_doc() -> dict:
    return data_loader.load_investigations()


@lru_cache(maxsize=1)
def _findings_doc() -> dict:
    return data_loader.load_findings()


@router.get("/evidence")
def list_evidence(
    customer_id: Optional[str] = Query(default=None),
    finding_id: Optional[str] = Query(default=None),
    rule_id: Optional[str] = Query(default=None),
    summary: bool = Query(default=False),
) -> dict:
    doc = _evidence_doc()
    packages: List[dict] = doc.get("evidence_packages", [])
    if customer_id:
        packages = [p for p in packages if p.get("customer_id") == customer_id]
    if finding_id:
        packages = [p for p in packages if p.get("finding_id") == finding_id]
    if rule_id:
        packages = [p for p in packages if p.get("rule_id") == rule_id]
    if summary:
        by_finding = {f.get("finding_id"): f for f in _findings_doc().get("findings", [])}
        packages = [_summarize_package(p, by_finding.get(p.get("finding_id"), {}))
                    for p in packages]
    return {**doc, "evidence_packages": packages, "total": len(packages)}


def _summarize_package(package: dict, finding: dict) -> dict:
    primaries = package.get("primary_transactions", []) or []
    return {
        "finding_id": package.get("finding_id"),
        "investigation_id": f"INV-{package.get('finding_id')}",
        "customer_id": package.get("customer_id"),
        "rule_id": package.get("rule_id"),
        "rule_name": finding.get("rule_name"),
        "severity": finding.get("severity"),
        "primary_count": len(primaries),
        "related_count": len(package.get("related_transactions", []) or []),
        "payees": sorted({t.get("payee") for t in primaries if t.get("payee")}),
        "anchor_timestamp": (package.get("temporal_context") or {}).get("anchor_timestamp"),
    }


@router.get("/investigations/{investigation_id}")
def get_investigation(investigation_id: str) -> dict:
    doc = _investigations_doc()
    normalized = investigation_id.upper().replace("INV-", "")
    for inv in doc.get("investigations", []):
        inv_norm = str(inv.get("investigation_id", "")).upper().replace("INV-", "")
        if inv_norm == normalized:
            return inv
    from fastapi.responses import JSONResponse
    return JSONResponse({"detail": f"Investigation '{investigation_id}' not found."},
                        status_code=404)


@router.get("/customers/{customer_id}/investigation")
def customer_investigation(customer_id: str) -> dict:
    findings = [f for f in _findings_doc().get("findings", [])
                if f.get("customer_id") == customer_id]
    packages = [p for p in _evidence_doc().get("evidence_packages", [])
                if p.get("customer_id") == customer_id]
    fids = sorted(f.get("finding_id") for f in findings)
    customers = {c.get("customer_id"): c for c in data_loader.load_customers()}
    return {
        "investigation_id": f"INV-{customer_id}",
        "customer_id": customer_id,
        "finding_ids": fids,
        "findings": sorted(findings, key=lambda x: x.get("finding_id", "")),
        "evidence_packages": sorted(packages, key=lambda x: x.get("finding_id", "")),
        "customer_profile": customers.get(customer_id, {}),
        "source": {
            "transactions": "data/transactions.csv",
            "customer_baseline": "data/customer_baselines.json",
            "payee_baseline": "data/payee_baselines.json",
            "findings": "data/findings.json",
        },
    }
