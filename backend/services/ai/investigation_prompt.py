"""Phase 4 — grounded prompt builder for investigation explanations.

Serializes a Phase 3 InvestigationContext into a strict evidence-only
prompt. The model must echo supplied facts and calculations; it must
never invent transactions, baselines, rules, or verdicts.
"""

import json

from backend.services.ai.grounding_validator import BANNED_PHRASES

SYSTEM_INSTRUCTION = """You are a banking transaction investigation assistant. Your role is to EXPLAIN deterministic investigation findings that were already computed by a rule engine. You do NOT determine whether fraud occurred, and you do NOT override deterministic rules.

Strict grounding rules:
- Use ONLY the supplied investigation context. Do not invent transactions, amounts, dates, payees, channels, baselines, rules, findings, or calculations.
- Reference transaction IDs, finding IDs, and rule IDs EXACTLY as supplied. Never introduce IDs that are not in the context.
- Report supplied calculations verbatim (amounts, ratios, z-scores, thresholds, counts, windows). Do not recalculate.
- If information is missing, say "Insufficient evidence in the supplied investigation context." Never guess.
- Distinguish observed FACTS, supplied CALCULATIONS, neutral INTERPRETATION of the deviation, ANALYST CONSIDERATIONS (checks an analyst may perform), and UNCERTAINTY.
- FORBIDDEN wording (never use): {banned}
- Use review language only: "Rule triggered", "Potentially unusual activity", "Activity differs from the customer's established behavior", "Transaction requires investigation", "The available evidence is insufficient to determine intent."
""".format(banned="; ".join(f'"{p}"' for p in BANNED_PHRASES))

OUTPUT_REQUIREMENTS = """Return ONLY a single JSON object (no markdown, no commentary) with EXACTLY these fields:
{
  "executive_summary": "2-4 sentence overview",
  "what_happened": "factual account grounded in primary transactions",
  "why_flagged": "which rules triggered and the supplied calculations behind each",
  "behavioral_comparison": "observed behavior vs customer baseline",
  "rule_explanations": [{"rule_id": "R01", "rule_name": "...", "triggered": true, "explanation": "...", "transaction_ids": ["TX..."], "evidence_references": ["F..."]}],
  "key_evidence": [{"title": "...", "observation": "...", "supporting_transaction_ids": ["TX..."], "baseline_reference": "...", "calculation_reference": "..."}],
  "analyst_considerations": ["concrete check an analyst may perform", ...],
  "uncertainty": "what the evidence cannot establish",
  "source_references": [{"source_type": "transaction|finding|baseline|evidence", "source_id": "TX...|F...|CUSTOMER-...", "transaction_ids": ["TX..."], "description": "..."}]
}
Every transaction ID you mention MUST appear in the supplied context. Every rule_id MUST be one of the supplied triggered rules."""


def _compact_context(context: dict, max_related: int = 10) -> dict:
    """Trim an InvestigationContext to the fields Gemini needs."""
    findings = []
    for f in context.get("findings", []):
        findings.append({
            "finding_id": f.get("finding_id"),
            "rule_id": f.get("rule_id"),
            "rule_name": f.get("rule_name"),
            "severity": f.get("severity"),
            "summary": f.get("summary"),
            "transaction_ids": f.get("transaction_ids"),
            "detected_at": f.get("detected_at"),
            "evidence": f.get("evidence"),
            "baseline": f.get("baseline"),
            "calculation": f.get("calculation"),
        })
    packages = []
    for p in context.get("evidence_packages", []):
        packages.append({
            "finding_id": p.get("finding_id"),
            "rule_id": p.get("rule_id"),
            "primary_transactions": p.get("primary_transactions"),
            "related_transactions": (p.get("related_transactions") or [])[:max_related],
            "customer_context": p.get("customer_context"),
            "payee_context": p.get("payee_context"),
            "temporal_context": p.get("temporal_context"),
            "baseline_comparison": p.get("baseline_comparison"),
            "calculation": p.get("calculation"),
        })
    return {
        "investigation_id": context.get("investigation_id"),
        "customer_id": context.get("customer_id"),
        "finding_ids": context.get("finding_ids"),
        "customer_profile": context.get("customer_profile"),
        "findings": findings,
        "evidence_packages": packages,
    }


def build_investigation_prompt(context: dict) -> str:
    """Build the full Gemini prompt for an investigation context."""
    compact = _compact_context(context or {})
    body = json.dumps(compact, indent=2, sort_keys=True, default=str)
    return (
        f"{SYSTEM_INSTRUCTION}\n\n"
        "INVESTIGATION CONTEXT (authoritative deterministic data):\n"
        f"{body}\n\n"
        f"{OUTPUT_REQUIREMENTS}"
    )
