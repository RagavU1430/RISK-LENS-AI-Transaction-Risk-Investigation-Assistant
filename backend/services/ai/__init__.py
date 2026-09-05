"""Phase 4 — Gemini investigation intelligence layer (explanation only).

The deterministic pipeline (transactions → baselines → rules → findings →
evidence → investigation context) is the sole source of truth. This package
only explains already-computed evidence via Gemini and validates that every
AI statement stays grounded in the supplied context.
"""

from backend.services.ai.grounding_validator import validate_grounding
from backend.services.ai.investigation_ai import generate_investigation_analysis
from backend.services.ai.investigation_prompt import build_investigation_prompt
from backend.services.ai.response_parser import parse_ai_response

__all__ = [
    "build_investigation_prompt",
    "generate_investigation_analysis",
    "parse_ai_response",
    "validate_grounding",
]
