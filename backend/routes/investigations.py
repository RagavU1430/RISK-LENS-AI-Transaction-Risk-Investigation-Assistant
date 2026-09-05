"""Phase 4 — AI investigation-analysis API (explanation only).

The deterministic investigation endpoints in evidence.py remain the source
of truth. These routes only attach an evidence-grounded Gemini explanation.
Without GEMINI_API_KEY a controlled "unavailable" response is returned and
all deterministic data stays available.
"""

from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from backend.services.ai.investigation_ai import (
    generate_investigation_analysis,
    load_investigation_context,
)

router = APIRouter()


def _analysis(investigation_id: str, force_refresh: bool):
    context = load_investigation_context(investigation_id)
    if context is None or not context.get("findings"):
        return JSONResponse(
            {"detail": f"Investigation '{investigation_id}' not found."},
            status_code=404)
    return generate_investigation_analysis(
        context.get("investigation_id", investigation_id),
        context, force_refresh=force_refresh)


@router.get("/investigations/{investigation_id}/analysis", response_model=None)
def get_analysis(investigation_id: str,
                 refresh: Optional[bool] = Query(default=False)):
    return _analysis(investigation_id, force_refresh=bool(refresh))


@router.post("/investigations/{investigation_id}/analysis", response_model=None)
def regenerate_analysis(investigation_id: str):
    return _analysis(investigation_id, force_refresh=True)
