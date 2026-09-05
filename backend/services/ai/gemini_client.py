"""Phase 4 — thin Gemini transport (communication only, no business logic).

Uses the Generative Language REST API through httpx (already a project
dependency), so no extra SDK is required. Reads credentials and model
selection from central config at call time. Never logs secrets.
"""

import httpx

API_BASE = "https://generativelanguage.googleapis.com/v1beta"


class GeminiUnavailable(Exception):
    """Raised when no API key is configured."""


class GeminiAPIError(Exception):
    """Raised for transport/API failures (timeout, HTTP error, bad payload)."""


def generate_content(prompt: str, config=None) -> str:
    """Send a prompt to Gemini and return the raw response text."""
    from backend.config import settings as default_settings

    cfg = config or default_settings
    api_key = (getattr(cfg, "gemini_api_key", "") or "").strip()
    if not api_key:
        raise GeminiUnavailable("Gemini API key is not configured")
    model = (getattr(cfg, "gemini_model", "") or "gemini-3.5-flash-lite").strip()
    timeout = int(getattr(cfg, "gemini_timeout_seconds", 60) or 60)

    url = f"{API_BASE}/models/{model}:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }
    try:
        response = httpx.post(url, params={"key": api_key}, json=payload,
                              timeout=timeout)
    except httpx.TimeoutException as exc:
        raise GeminiAPIError(f"Gemini request timed out after {timeout}s") from exc
    except httpx.HTTPError as exc:
        raise GeminiAPIError(f"Gemini request failed: {type(exc).__name__}") from exc

    if response.status_code != 200:
        # Never include the key or body details that could leak credentials.
        raise GeminiAPIError(f"Gemini API returned HTTP {response.status_code}")
    try:
        data = response.json()
        parts = data["candidates"][0]["content"]["parts"]
        text = "".join(p.get("text", "") for p in parts if isinstance(p, dict))
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise GeminiAPIError("Gemini API returned an unexpected payload") from exc
    if not text.strip():
        raise GeminiAPIError("Gemini API returned an empty response")
    return text
