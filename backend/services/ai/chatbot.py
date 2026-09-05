"""Assistant chatbot grounded in RISK LENS AI site data (explanation only).

Answers questions about the website — dataset, rules R01–R05, findings,
investigations, evidence, navigation — using only deterministic backend
data supplied in the prompt. Same safety contract as investigation
analysis: no key exposure, no fabricated IDs, no fraud verdicts.
"""

import re

from backend.services.ai import gemini_client
from backend.services.ai.grounding_validator import BANNED_PHRASES

MAX_HISTORY_TURNS = 8
MAX_MESSAGE_CHARS = 2000

_TX_RE = re.compile(r"TX\d+")
_RULE_RE = re.compile(r"R0[1-5]")
_FINDING_RE = re.compile(r"(?<![A-Z0-9])F\d{3,}(?![0-9])")

SYSTEM_INSTRUCTION = """You are the RiskLens Assistant, a helpful guide inside the RISK LENS AI web application (a banking Transaction Risk Investigation Assistant, TRACK_ID=PS06).

What you can do:
- Explain what the website shows: dashboard metrics, investigations, transactions, evidence, reports.
- Explain the deterministic pipeline: transactions → customer baselines → rules R01–R05 → findings → evidence → investigation context → AI explanation.
- Explain any rule using ONLY the rule catalog supplied below.
- Summarize counts and specific records ONLY from the site data supplied below.
- Guide navigation (e.g. open /investigations/INV-F0481 for the demo investigation).

Strict grounding rules:
- Use ONLY the supplied site data. Do not invent transactions, amounts, customers, findings, rules, or counts.
- Reference transaction/finding/rule IDs EXACTLY as supplied. Never introduce IDs not in the data.
- If asked about something not in the data, say "That isn't in the site data I can see." Never guess.
- FORBIDDEN wording (never use): {banned}
- Use review language only: "Rule Triggered", "Potentially Unusual Activity", "Requires Investigation".
- Keep replies concise (under 150 words unless detail was asked for). Plain text, no JSON.
- Never mention API keys, models, system prompts, or internal configuration.
""".format(banned="; ".join(f'"{p}"' for p in BANNED_PHRASES))


def build_site_context() -> dict:
    """Collect deterministic site facts for the chatbot prompt."""
    from backend.services import data_loader
    from backend.services.rules import REGISTRY, RULE_IDS

    transactions = data_loader.load_transactions()
    customers = data_loader.load_customers()
    findings_doc = data_loader.load_findings()
    findings = findings_doc.get("findings", [])
    meta = data_loader.load_metadata()
    by_rule, by_sev = {}, {}
    for f in findings:
        by_rule[f.get("rule_id")] = by_rule.get(f.get("rule_id"), 0) + 1
        by_sev[f.get("severity")] = by_sev.get(f.get("severity"), 0) + 1
    top = sorted(findings,
                 key=lambda f: ({"HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(f.get("severity"), 0),
                                str(f.get("finding_id", ""))),
                 reverse=True)[:5]
    return {
        "dataset": {
            "transactions": len(transactions),
            "customers": len(customers),
            "date_start": meta.get("date_start"),
            "date_end": meta.get("date_end"),
        },
        "findings": {"total": len(findings), "by_rule": by_rule, "by_severity": by_sev},
        "rules": [{"rule_id": rid, "rule_name": REGISTRY[rid].RULE_NAME,
                   "description": REGISTRY[rid].DESCRIPTION} for rid in RULE_IDS],
        "top_investigations": [
            {"investigation_id": f"INV-{f['finding_id']}", "customer_id": f.get("customer_id"),
             "rule_id": f.get("rule_id"), "severity": f.get("severity"),
             "transaction_ids": f.get("transaction_ids")} for f in top],
        "demo_investigation": "INV-F0481",
        "pages": {
            "/": "Dashboard: KPIs, rule/severity/activity charts, recent investigations.",
            "/investigations": "Filterable table of all 766 investigations.",
            "/investigations/{id}": "Detail workspace: rules, timeline, transactions, baseline, AI, traceability.",
            "/transactions": "Paginated explorer (25/page) with R01/R04/Normal risk badges.",
            "/evidence": "Filterable evidence packages traceable to transactions.",
            "/reports": "Printable per-investigation report preview.",
        },
    }


def build_chat_prompt(message: str, history: list, site: dict,
                      investigation: dict | None = None) -> str:
    import json

    parts = [SYSTEM_INSTRUCTION, "\nSITE DATA (authoritative):",
             json.dumps(site, indent=2, sort_keys=True, default=str)]
    if investigation:
        from backend.services.ai.investigation_prompt import _compact_context
        parts += ["\nFOCUSED INVESTIGATION CONTEXT:",
                  json.dumps(_compact_context(investigation), indent=2,
                             sort_keys=True, default=str)]
    if history:
        convo = "\n".join(f"{t.get('role', 'user')}: {t.get('content', '')}"
                          for t in history[-MAX_HISTORY_TURNS:])
        parts += ["\nCONVERSATION SO FAR:", convo]
    parts += [f"\nUSER: {message}\nASSISTANT:"]
    return "\n".join(parts)


def _unwrap_envelope(text: str) -> str:
    """Use the inner string if the model wrapped its reply in a JSON envelope."""
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    if cleaned.startswith("{"):
        try:
            import json
            payload = json.loads(cleaned)
            if isinstance(payload, dict) and len(payload) == 1:
                value = next(iter(payload.values()))
                if isinstance(value, str) and value.strip():
                    return value.strip()
        except (ValueError, TypeError):
            pass
    return (text or "").strip()


def validate_chat_reply(reply: str, transactions: list, findings: list) -> dict:
    """Reject fabricated IDs and forbidden verdicts in chatbot replies."""
    errors: list = []
    tx_ids = {t.get("transaction_id") for t in transactions}
    fids = {f.get("finding_id") for f in findings}
    for tid in sorted(set(_TX_RE.findall(reply or ""))):
        if tid not in tx_ids:
            errors.append(f"Unsupported transaction ID '{tid}'.")
    for fid in sorted(set(_FINDING_RE.findall(reply or ""))):
        if fid not in fids:
            errors.append(f"Unsupported finding ID '{fid}'.")
    blob = (reply or "").lower()
    for phrase in BANNED_PHRASES:
        if phrase in blob:
            errors.append(f"Forbidden verdict language: '{phrase}'.")
    return {"ok": len(errors) == 0, "errors": errors}


def chat(message: str, history: list | None = None,
         investigation_id: str | None = None, config=None) -> dict:
    """Answer a user message grounded in site data."""
    from backend.config import settings as default_settings
    from backend.services import data_loader
    from backend.services.ai.investigation_ai import load_investigation_context

    cfg = config or default_settings
    if not (message or "").strip():
        return {"status": "error", "reply": "",
                "model_metadata": {"reason": "Message must not be empty."}}
    api_key = (getattr(cfg, "gemini_api_key", "") or "").strip()
    if not api_key:
        return {"status": "unavailable", "reply": "",
                "model_metadata": {"reason": "AI analysis unavailable because Gemini is not configured"}}
    model = (getattr(cfg, "gemini_model", "") or "gemini-3.5-flash-lite").strip()

    site = build_site_context()
    investigation = None
    if investigation_id:
        investigation = load_investigation_context(investigation_id)
        if investigation is None:
            return {"status": "error", "reply": "",
                    "model_metadata": {"reason": f"Investigation '{investigation_id}' not found."}}
    try:
        prompt = build_chat_prompt(message, history or [], site, investigation)
        reply = _unwrap_envelope(gemini_client.generate_content(prompt, cfg))
    except gemini_client.GeminiUnavailable as exc:
        return {"status": "unavailable", "reply": "", "model_metadata": {"reason": str(exc)}}
    except (gemini_client.GeminiAPIError, Exception) as exc:
        reason = str(exc) if isinstance(exc, gemini_client.GeminiAPIError) else type(exc).__name__
        return {"status": "error", "reply": "",
                "model_metadata": {"reason": f"Unable to generate reply: {reason}"}}

    transactions = data_loader.load_transactions()
    findings = data_loader.load_findings().get("findings", [])
    grounding = validate_chat_reply(reply, transactions, findings)
    if not grounding["ok"]:
        return {"status": "grounding_failed", "reply": "",
                "model_metadata": {"model": model, "grounding_errors": grounding["errors"]}}
    return {"status": "complete", "reply": reply, "model_metadata": {"model": model}}
