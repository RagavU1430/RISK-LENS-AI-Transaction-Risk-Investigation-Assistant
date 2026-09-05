"""Chatbot tests with mocked Gemini (no network, no key)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import app  # noqa: E402
from backend.config import settings as app_settings  # noqa: E402
from backend.services.ai import chatbot, gemini_client  # noqa: E402

client = TestClient(app)


def _mock_key(monkeypatch, key="test-key"):
    monkeypatch.setattr(app_settings, "gemini_api_key", key)


def test_site_context_has_real_counts():
    site = chatbot.build_site_context()
    assert site["dataset"]["transactions"] == 8966
    assert site["dataset"]["customers"] == 20
    assert site["findings"]["total"] == 766
    assert len(site["rules"]) == 5
    assert site["demo_investigation"] == "INV-F0481"


def test_prompt_contains_site_facts_no_secrets():
    site = chatbot.build_site_context()
    prompt = chatbot.build_chat_prompt("What is this site?", [], site, None)
    assert "8966" in prompt and "R01" in prompt
    assert "GEMINI_API_KEY" not in prompt and "AQ.Ab8" not in prompt


def test_valid_reply_complete(monkeypatch):
    _mock_key(monkeypatch)
    monkeypatch.setattr(gemini_client, "generate_content",
                        lambda prompt, config=None: "This site shows 766 findings across rules R01 to R05.")
    out = chatbot.chat("What does the site show?")
    assert out["status"] == "complete"
    assert "766" in out["reply"]


def test_json_envelope_unwrapped(monkeypatch):
    _mock_key(monkeypatch)
    monkeypatch.setattr(gemini_client, "generate_content",
                        lambda prompt, config=None: '{"response": "Rule R01 flags large transactions."}')
    out = chatbot.chat("Explain R01.")
    assert out["status"] == "complete"
    assert out["reply"] == "Rule R01 flags large transactions."


def test_no_key_unavailable(monkeypatch):
    _mock_key(monkeypatch, "")
    out = chatbot.chat("Hello?")
    assert out["status"] == "unavailable"
    assert out["reply"] == ""


def test_failure_controlled_error(monkeypatch):
    _mock_key(monkeypatch)

    def boom(prompt, config=None):
        raise gemini_client.GeminiAPIError("HTTP 500")

    monkeypatch.setattr(gemini_client, "generate_content", boom)
    out = chatbot.chat("Hello?")
    assert out["status"] == "error"


def test_fabricated_tx_rejected(monkeypatch):
    _mock_key(monkeypatch)
    monkeypatch.setattr(gemini_client, "generate_content",
                        lambda prompt, config=None: "See transaction TX999999 for details.")
    out = chatbot.chat("Tell me more.")
    assert out["status"] == "grounding_failed"


def test_banned_phrase_rejected(monkeypatch):
    _mock_key(monkeypatch)
    monkeypatch.setattr(gemini_client, "generate_content",
                        lambda prompt, config=None: "This is definitely fraud.")
    out = chatbot.chat("Is it fraud?")
    assert out["status"] == "grounding_failed"


def test_unknown_investigation_error(monkeypatch):
    _mock_key(monkeypatch)
    out = chatbot.chat("Explain this.", investigation_id="INV-NOPE")
    assert out["status"] == "error"


def test_api_chat_success(monkeypatch):
    _mock_key(monkeypatch)
    monkeypatch.setattr(gemini_client, "generate_content",
                        lambda prompt, config=None: "RISK LENS AI investigates transaction risk.")
    r = client.post("/api/v1/chat", json={"message": "What is this?"})
    assert r.status_code == 200
    assert r.json()["status"] == "complete"


def test_api_chat_empty_message_422():
    assert client.post("/api/v1/chat", json={"message": ""}).status_code == 422


def test_whitespace_message_controlled_error(monkeypatch):
    _mock_key(monkeypatch)
    out = chatbot.chat("   ")
    assert out["status"] == "error"


def test_api_chat_no_key_unavailable(monkeypatch):
    _mock_key(monkeypatch, "")
    r = client.post("/api/v1/chat", json={"message": "Hi"})
    assert r.json()["status"] == "unavailable"
