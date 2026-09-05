"""RiskLens AI — single application entry point.

Running `python app.py` starts the complete application
(FastAPI backend + served React frontend) on http://localhost:8000

The frontend is served from `frontend/dist` (Vite production build).
If `frontend/dist` is missing, the API still works and a helpful
developer message is shown at `/`.
"""

from pathlib import Path

import uvicorn
from fastapi import FastAPI, Response
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.routes.browse import router as browse_router
from backend.routes.chat import router as chat_router
from backend.routes.data import router as data_router
from backend.routes.evidence import router as evidence_router
from backend.routes.health import router as health_router
from backend.routes.investigations import router as investigations_router
from backend.routes.risk import router as risk_router

BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "frontend" / "dist"

app = FastAPI(
    title="RiskLens AI",
    description="Transaction Risk Investigation Assistant — deterministic risk engine + evidence + grounded AI",
    version="1.0.0",
)

# --- API routes -------------------------------------------------------------
app.include_router(health_router, prefix="/api/v1")
app.include_router(data_router, prefix="/api/v1")
app.include_router(browse_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(risk_router, prefix="/api/v1")
app.include_router(evidence_router, prefix="/api/v1")
app.include_router(investigations_router, prefix="/api/v1")


@app.get("/api/v1/root", include_in_schema=False)
def api_root() -> JSONResponse:
    return JSONResponse({"service": settings.app_name, "env": settings.env})


# --- Frontend serving -------------------------------------------------------
# Vite builds to frontend/dist with assets at frontend/dist/assets.
# We mount /assets directly so index.html's absolute /assets/* references work.
# All other frontend routes fall through to the SPA index.html.
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
else:
    # Log once at import time — not fatal, API still works.
    print(f"[RiskLens AI] Warning: frontend assets not found at {DIST_DIR / 'assets'}")
    print("[RiskLens AI] Run: cd frontend && npm install && npm run build")


def _frontend_missing_message() -> HTMLResponse:
    return HTMLResponse(
        content=(
            "<html><head><title>RiskLens AI — Build Required</title></head>"
            "<body style='font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;"
            "background:#0b1220;color:#e2e8f0;display:flex;align-items:center;"
            "justify-content:center;min-height:100vh;margin:0;padding:24px'>"
            "<div style='max-width:560px;width:100%;padding:32px;border:1px solid #1e293b;"
            "border-radius:16px;background:rgba(255,255,255,0.02)'>"
            "<h1 style='margin:0 0 8px;font-size:20px'>RiskLens AI — frontend not built</h1>"
            "<p style='margin:0 0 16px;color:#94a3b8'>The production bundle at "
            "<code style='background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:6px'>frontend/dist</code> "
            "was not found. The API is still running.</p>"
            "<p style='margin:0 0 8px;color:#e2e8f0;font-weight:600'>Build it:</p>"
            "<pre style='background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:12px;overflow:auto'>"
            "cd frontend\nnpm install\nnpm run build</pre>"
            "<p style='margin:16px 0 0'><a style='color:#38bdf8' href='/api/v1/health'>API health</a>"
            " · <a style='color:#38bdf8' href='/docs'>API docs</a></p>"
            "</div></body></html>"
        ),
        status_code=200,
    )


@app.get("/", include_in_schema=False, response_model=None, response_class=Response)
def serve_root() -> Response:
    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return _frontend_missing_message()


@app.get("/{full_path:path}", include_in_schema=False, response_model=None, response_class=Response)
def serve_spa(full_path: str) -> Response:
    """SPA fallback: serve static files or index.html for frontend routes."""
    # Never hijack API routes.
    if full_path.startswith("api/"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    candidate = DIST_DIR / full_path
    # Serve real files (e.g. favicon, vite.svg) directly when they exist in dist.
    if full_path and candidate.is_file():
        return FileResponse(candidate)

    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return _frontend_missing_message()


@app.on_event("startup")
async def _startup_banner():
    frontend_status = "Ready ✓" if (DIST_DIR / "index.html").exists() else "Not built — run: cd frontend && npm run build"
    print("\n" + "=" * 60)
    print(" RISK LENS AI — Transaction Risk Investigation Assistant")
    print("=" * 60)
    print(f" Backend : http://localhost:{settings.port}/api/v1/health")
    print(f" Frontend: http://localhost:{settings.port}/  [{frontend_status}]")
    print(f" Docs    : http://localhost:{settings.port}/docs")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    # Single-command startup: `python app.py` serves both API and frontend.
    uvicorn.run(app, host="0.0.0.0", port=settings.port, log_level="info")
