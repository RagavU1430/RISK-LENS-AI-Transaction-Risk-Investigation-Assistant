"""Phase 5 — read-only browsing endpoints over committed artifacts.

Presentation support only: pagination, filtering, and lightweight joining
of already-computed deterministic data. No risk logic, no recalculation,
no contract changes to existing routes.
"""

from functools import lru_cache
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.services import data_loader

router = APIRouter()

SEV_RANK = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
MAX_LIMIT = 200


@lru_cache(maxsize=1)
def _transactions() -> list:
    return data_loader.load_transactions()


@lru_cache(maxsize=1)
def _findings() -> list:
    return data_loader.load_findings().get("findings", [])


@lru_cache(maxsize=1)
def _investigations() -> list:
    return data_loader.load_investigations().get("investigations", [])


@lru_cache(maxsize=1)
def _tx_rule_index() -> dict:
    """transaction_id -> list of {rule_id, rule_name, finding_id, severity}."""
    index: dict = {}
    for f in _findings():
        entry = {"rule_id": f.get("rule_id"), "rule_name": f.get("rule_name"),
                 "finding_id": f.get("finding_id"), "severity": f.get("severity")}
        for tid in f.get("transaction_ids") or []:
            index.setdefault(tid, []).append(entry)
    return index


def _max_severity(severities: list) -> str:
    best, rank = "LOW", 0
    for s in severities:
        if SEV_RANK.get(str(s).upper(), 0) >= rank:
            best, rank = str(s).upper(), SEV_RANK.get(str(s).upper(), 0)
    return best


def _summarize(inv: dict) -> dict:
    findings = inv.get("findings", []) or []
    rules, seen = [], set()
    for f in findings:
        if f.get("rule_id") not in seen:
            seen.add(f.get("rule_id"))
            rules.append({"rule_id": f.get("rule_id"), "rule_name": f.get("rule_name")})
    tids = sorted({t for f in findings for t in (f.get("transaction_ids") or [])})
    detected = sorted(f.get("detected_at", "") for f in findings if f.get("detected_at"))
    return {
        "investigation_id": inv.get("investigation_id"),
        "customer_id": inv.get("customer_id"),
        "finding_ids": inv.get("finding_ids", []),
        "rules": rules,
        "severities": sorted({f.get("severity") for f in findings}),
        "max_severity": _max_severity([f.get("severity") for f in findings]),
        "transaction_count": len(tids),
        "transaction_ids": tids,
        "detected_at": detected[-1] if detected else None,
    }


@router.get("/investigations")
def list_investigations(
    customer_id: Optional[str] = Query(default=None),
    rule_id: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=1000, le=2000),
) -> dict:
    summaries = [_summarize(inv) for inv in _investigations()]
    if customer_id:
        summaries = [s for s in summaries if s["customer_id"] == customer_id]
    if rule_id:
        summaries = [s for s in summaries
                     if any(r["rule_id"] == rule_id for r in s["rules"])]
    if severity:
        summaries = [s for s in summaries
                     if severity.upper() in (s["severities"] or [])]
    if search:
        q = search.lower()
        summaries = [s for s in summaries
                     if q in str(s["investigation_id"]).lower()
                     or q in str(s["customer_id"]).lower()
                     or any(q in str(r["rule_id"]).lower() for r in s["rules"])]
    summaries.sort(key=lambda s: s["detected_at"] or "", reverse=True)
    findings = _findings()
    by_rule: dict = {}
    by_sev: dict = {}
    for f in findings:
        by_rule[f.get("rule_id")] = by_rule.get(f.get("rule_id"), 0) + 1
        by_sev[f.get("severity")] = by_sev.get(f.get("severity"), 0) + 1
    return {
        "total": len(summaries),
        "stats": {
            "investigations": len(_investigations()),
            "findings": len(findings),
            "high_severity": by_sev.get("HIGH", 0),
            "by_rule": by_rule,
            "by_severity": by_sev,
        },
        "investigations": summaries[:limit],
    }


@router.get("/transactions")
def list_transactions(
    customer_id: Optional[str] = Query(default=None),
    channel: Optional[str] = Query(default=None),
    transaction_type: Optional[str] = Query(default=None),
    payee: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    risk: str = Query(default="all"),
    limit: int = Query(default=50, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    order: str = Query(default="desc"),
) -> dict:
    index = _tx_rule_index()
    rows = list(_transactions())
    if customer_id:
        rows = [t for t in rows if t.get("customer_id") == customer_id]
    if channel:
        rows = [t for t in rows if str(t.get("channel", "")).upper() == channel.upper()]
    if transaction_type:
        rows = [t for t in rows
                if str(t.get("transaction_type", "")).upper() == transaction_type.upper()]
    if payee:
        rows = [t for t in rows if payee.lower() in str(t.get("payee", "")).lower()]
    if search:
        q = search.lower()
        rows = [t for t in rows
                if q in str(t.get("transaction_id", "")).lower()
                or q in str(t.get("payee", "")).lower()
                or q in str(t.get("description", "")).lower()]
    if risk == "flagged":
        rows = [t for t in rows if t.get("transaction_id") in index]
    elif risk == "normal":
        rows = [t for t in rows if t.get("transaction_id") not in index]
    rows.sort(key=lambda t: t.get("timestamp", ""), reverse=(order != "asc"))
    total = len(rows)
    page = rows[offset:offset + limit]
    return {
        "total": total, "limit": limit, "offset": offset,
        "transactions": [
            {**t, "triggered_rules": sorted({e["rule_id"] for e in index.get(t.get("transaction_id"), [])})}
            for t in page
        ],
    }


@router.get("/transactions/{transaction_id}")
def transaction_detail(transaction_id: str):
    found = next((t for t in _transactions()
                  if t.get("transaction_id") == transaction_id), None)
    if found is None:
        return JSONResponse({"detail": f"Transaction '{transaction_id}' not found."},
                            status_code=404)
    rules = _tx_rule_index().get(transaction_id, [])
    return {
        **found,
        "triggered_rules": sorted({e["rule_id"] for e in rules}),
        "rule_details": rules,
        "finding_ids": sorted({e["finding_id"] for e in rules}),
        "investigation_ids": sorted({f"INV-{e['finding_id']}" for e in rules}),
    }


@router.get("/customers")
def list_customers() -> dict:
    counts: dict = {}
    worst: dict = {}
    for f in _findings():
        cid = f.get("customer_id")
        counts[cid] = counts.get(cid, 0) + 1
        if SEV_RANK.get(f.get("severity"), 0) >= SEV_RANK.get(worst.get(cid, "LOW"), 0):
            worst[cid] = f.get("severity")
    customers = [{**c, "finding_count": counts.get(c.get("customer_id"), 0),
                  "max_severity": worst.get(c.get("customer_id"))}
                 for c in data_loader.load_customers()]
    return {"total": len(customers), "customers": customers}


@router.get("/ai/status")
def ai_status() -> dict:
    available = bool((settings.gemini_api_key or "").strip())
    return {
        "available": available,
        "model": settings.gemini_model if available else None,
        "reason": None if available else "Gemini API key is not configured",
    }
