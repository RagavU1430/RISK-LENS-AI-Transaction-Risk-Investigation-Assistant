"""Phase 4 — AI investigation orchestrator (explanation only, never detection).

Flow: validate context → build prompt → Gemini → parse JSON → Pydantic
validation → grounding validation → InvestigationAIReport. Results are
cached per investigation_id + context hash in data/ai_analysis.json.

Without GEMINI_API_KEY the deterministic pipeline keeps working and a
controlled "unavailable" response is returned — never fabricated content.
"""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from backend.services.ai import gemini_client
from backend.services.ai.grounding_validator import validate_grounding
from backend.services.ai.investigation_prompt import build_investigation_prompt
from backend.services.ai.response_parser import AIParseError, parse_ai_response

BASE_DIR = Path(__file__).resolve().parents[3]
DEFAULT_CACHE_PATH = BASE_DIR / "data" / "ai_analysis.json"

UNAVAILABLE_REASON = "AI analysis unavailable because Gemini is not configured"


def context_hash(context: dict) -> str:
    canonical = json.dumps(context or {}, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_cache(cache_path: Path) -> dict:
    try:
        with open(cache_path, encoding="utf-8") as f:
            doc = json.load(f)
        if isinstance(doc, dict) and isinstance(doc.get("analyses"), dict):
            return doc
    except (OSError, ValueError):
        pass
    return {"version": 1, "analyses": {}}


def _save_cache(cache_path: Path, doc: dict) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=2)


def _unavailable(investigation_id: str, customer_id: str, reason: str) -> dict:
    return {
        "investigation_id": investigation_id, "customer_id": customer_id,
        "generated_at": _utcnow(), "status": "unavailable",
        "executive_summary": "", "what_happened": "", "why_flagged": "",
        "behavioral_comparison": "", "rule_explanations": [], "key_evidence": [],
        "analyst_considerations": [],
        "uncertainty": "AI explanation could not be generated.",
        "source_references": [],
        "model_metadata": {"reason": reason}, "cached": False,
    }


def _failure(investigation_id: str, customer_id: str, status: str,
             reason: str, metadata: dict | None = None) -> dict:
    report = _unavailable(investigation_id, customer_id, reason)
    report["status"] = status
    report["model_metadata"] = {"reason": reason, **(metadata or {})}
    return report


def load_investigation_context(investigation_id: str) -> dict | None:
    """Resolve an investigation context by ID.

    Supports per-finding investigations (INV-F0001) from
    investigation_context.json and per-customer investigations
    (INV-C001) built deterministically from findings + evidence.
    """
    from backend.services import data_loader

    normalized = (investigation_id or "").upper().replace("INV-", "")
    doc = data_loader.load_investigations()
    for inv in doc.get("investigations", []):
        inv_norm = str(inv.get("investigation_id", "")).upper().replace("INV-", "")
        if inv_norm == normalized:
            return inv
    if normalized.startswith("C"):
        customer_id = normalized
        findings = [f for f in data_loader.load_findings().get("findings", [])
                    if f.get("customer_id") == customer_id]
        if not findings and not any(c.get("customer_id") == customer_id
                                    for c in data_loader.load_customers()):
            return None
        packages = [p for p in data_loader.load_evidence().get("evidence_packages", [])
                    if p.get("customer_id") == customer_id]
        fids = sorted(f.get("finding_id") for f in findings)
        profile = next((c for c in data_loader.load_customers()
                        if c.get("customer_id") == customer_id), {})
        return {
            "investigation_id": f"INV-{customer_id}", "customer_id": customer_id,
            "finding_ids": fids, "findings": findings, "evidence_packages": packages,
            "customer_profile": profile,
            "source": {
                "transactions": "data/transactions.csv",
                "customer_baseline": "data/customer_baselines.json",
                "payee_baseline": "data/payee_baselines.json",
                "findings": "data/findings.json",
            },
        }
    return None


def generate_investigation_analysis(investigation_id: str, context: dict | None = None,
                                    force_refresh: bool = False,
                                    cache_path: Path | None = None,
                                    config=None) -> dict:
    """Generate (or reuse cached) AI explanation for an investigation."""
    from backend.config import settings as default_settings

    cfg = config or default_settings
    cache_file = Path(cache_path) if cache_path else DEFAULT_CACHE_PATH
    if context is None:
        context = load_investigation_context(investigation_id)
    if not context or not context.get("findings"):
        return _failure(investigation_id, (context or {}).get("customer_id", ""),
                        "error", f"Investigation '{investigation_id}' not found "
                                 "or has no deterministic findings.")
    customer_id = context.get("customer_id", "")
    digest = context_hash(context)

    if not force_refresh:
        cached = _load_cache(cache_file)["analyses"].get(context.get("investigation_id",
                                                                     investigation_id))
        if cached and cached.get("context_hash") == digest and cached.get("report"):
            report = dict(cached["report"])
            report["cached"] = True
            return report

    api_key = (getattr(cfg, "gemini_api_key", "") or "").strip()
    if not api_key:
        return _unavailable(context.get("investigation_id", investigation_id),
                            customer_id, UNAVAILABLE_REASON)

    model = (getattr(cfg, "gemini_model", "") or "gemini-3.5-flash-lite").strip()
    try:
        prompt = build_investigation_prompt(context)
        raw = gemini_client.generate_content(prompt, cfg)
        report_obj = parse_ai_response(raw, context.get("investigation_id",
                                                        investigation_id), customer_id)
        report = report_obj.model_dump()
    except gemini_client.GeminiUnavailable as exc:
        return _unavailable(context.get("investigation_id", investigation_id),
                            customer_id, str(exc))
    except (gemini_client.GeminiAPIError, AIParseError) as exc:
        return _failure(context.get("investigation_id", investigation_id), customer_id,
                        "error", f"Unable to generate AI analysis: {exc}",
                        {"model": model})
    except Exception as exc:  # never leak stack traces to API consumers
        return _failure(context.get("investigation_id", investigation_id), customer_id,
                        "error", f"Unable to generate AI analysis: {type(exc).__name__}",
                        {"model": model})

    grounding = validate_grounding(report, context)
    if not grounding["ok"]:
        return _failure(context.get("investigation_id", investigation_id), customer_id,
                        "grounding_failed",
                        "AI response failed evidence validation.",
                        {"model": model, "grounding_errors": grounding["errors"]})

    report["generated_at"] = _utcnow()
    report["model_metadata"] = {"model": model, "context_hash": digest}
    report["cached"] = False
    doc = _load_cache(cache_file)
    doc["analyses"][context.get("investigation_id", investigation_id)] = {
        "generated_at": report["generated_at"], "model": model,
        "context_hash": digest, "report": report,
    }
    try:
        _save_cache(cache_file, doc)
    except OSError:
        pass
    return report
