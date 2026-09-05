"""RiskLens AI — single application entry point.

Running `python app.py` starts the complete application
(FastAPI backend + served React frontend) on http://localhost:8000
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
    description="Transaction Risk Investigation Assistant — Phase 0 foundation",
    version="0.1.0",
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
# Serve built Vite assets directly (frontend/dist/assets -> /assets)
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")


def _frontend_missing_message() -> HTMLResponse:
    return HTMLResponse(
        content=(
            "<html><body style='font-family:system-ui;background:#0b1220;color:#e2e8f0;"
            "display:flex;align-items:center;justify-content:center;height:100vh;margin:0'>"
            "<div style='max-width:560px;padding:32px;border:1px solid #1e293b;border-radius:12px'>"
            "<h1>RiskLens AI — frontend not built</h1>"
            "<p><code>frontend/dist</code> was not found.</p>"
            "<p>Build it with:</p>"
            "<pre>cd frontend\nnpm install\nnpm run build</pre>"
            "<p>Then restart <code>python app.py</code>.</p>"
            "<p>API health: <a style='color:#38bdf8' href='/api/v1/health'>/api/v1/health</a></p>"
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
    # Serve real files (e.g. vite.svg, favicon) directly.
    if full_path and candidate.is_file():
        return FileResponse(candidate)

    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return _frontend_missing_message()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
