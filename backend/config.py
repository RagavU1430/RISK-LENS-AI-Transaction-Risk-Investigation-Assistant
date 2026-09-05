"""Central application configuration.

No secrets are hardcoded. All values come from environment variables
with safe defaults. See .env.example for future phases.
Phase 2 adds deterministic rule thresholds (no magic numbers in rules).
"""

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_name: str = "risklens-ai"
    env: str = os.getenv("APP_ENV", "development")
    port: int = int(os.getenv("PORT", "8000"))
    # Reserved for a later phase (Gemini + RAG). Not used in Phase 2.
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    # --- Phase 4 Gemini investigation layer (explanation only) ---
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    gemini_timeout_seconds: int = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "60"))

    # --- Phase 2 deterministic risk-engine thresholds ---
    R01_MULTIPLIER: float = float(os.getenv("R01_MULTIPLIER", "5.0"))
    R02_WINDOW_MINUTES: int = int(os.getenv("R02_WINDOW_MINUTES", "15"))
    R02_MIN_TRANSACTIONS: int = int(os.getenv("R02_MIN_TRANSACTIONS", "3"))
    R03_START_HOUR: int = int(os.getenv("R03_START_HOUR", "0"))
    R03_END_HOUR: int = int(os.getenv("R03_END_HOUR", "5"))
    R04_Z_THRESHOLD: float = float(os.getenv("R04_Z_THRESHOLD", "3.0"))
    R05_WINDOW_MINUTES: int = int(os.getenv("R05_WINDOW_MINUTES", "30"))
    R05_MIN_TRANSACTION_FLOOR: int = int(os.getenv("R05_MIN_TRANSACTION_FLOOR", "5"))


settings = Settings()
