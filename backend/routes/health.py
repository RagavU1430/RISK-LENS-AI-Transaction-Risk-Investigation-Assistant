"""Health-check endpoint."""

from fastapi import APIRouter

from backend.models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="risklens-ai")
