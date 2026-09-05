"""Phase 4 — safe parser for Gemini responses (no silent hallucination).

Strips markdown code fences, parses JSON, validates the strongly typed
InvestigationAIReport. Any failure yields a controlled error — never a
partially repaired object presented as valid.
"""

import json

from pydantic import ValidationError

from backend.models import InvestigationAIReport


class AIParseError(Exception):
    """Raised when a Gemini response cannot be safely parsed/validated."""


def _strip_fences(text: str) -> str:
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        # Drop opening fence (``` or ```json) and closing fence.
        lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    return cleaned


def parse_ai_response(raw_text: str, investigation_id: str = "",
                      customer_id: str = "") -> InvestigationAIReport:
    """Parse raw Gemini output into a validated InvestigationAIReport.

    Authoritative IDs are stamped from the deterministic context after
    validation so a model-echoed ID can never corrupt traceability.
    """
    cleaned = _strip_fences(raw_text)
    try:
        payload = json.loads(cleaned)
    except (json.JSONDecodeError, TypeError) as exc:
        raise AIParseError("Gemini response was not valid JSON") from exc
    if not isinstance(payload, dict):
        raise AIParseError("Gemini response was not a JSON object")
    try:
        report = InvestigationAIReport.model_validate(payload)
    except ValidationError as exc:
        raise AIParseError(f"Gemini response failed schema validation: {exc.errors()}") from exc
    if investigation_id:
        report.investigation_id = investigation_id
    if customer_id:
        report.customer_id = customer_id
    report.status = "complete"
    return report
