"""Phase 4 — orchestrator tests with mocked Gemini (no network, no key)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai_fixtures import VALID_AI_JSON, make_context  # noqa: E402
from backend.config import settings as app_settings  # noqa: E402
from backend.services.ai import gemini_client, investigation_ai  # noqa: E402


def _ctx():
    return make_context()


def _ok(monkeypatch, tmp_path, payload=VALID_AI_JSON):
    calls = []
    monkeypatch.setattr(app_settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(app_settings, "gemini_model", "test-model")

    def fake_generate(prompt, config=None):
        calls.append(prompt)
        return payload

    monkeypatch.setattr(gemini_client, "generate_content", fake_generate)
    cache = tmp_path / "ai.json"
    return calls, cache


def test_valid_response_returns_complete_and_caches(monkeypatch, tmp_path):
    calls, cache = _ok(monkeypatch, tmp_path)
    first = investigation_ai.generate_investigation_analysis(
        "INV-F0001", _ctx(), cache_path=cache)
    assert first["status"] == "complete"
    assert first["cached"] is False
    assert first["model_metadata"]["model"] == "test-model"
    assert first["rule_explanations"][0]["rule_id"] == "R01"
    second = investigation_ai.generate_investigation_analysis(
        "INV-F0001", _ctx(), cache_path=cache)
    assert second["cached"] is True
    assert len(calls) == 1  # cache hit: no second Gemini call


def test_cache_invalidated_when_context_changes(monkeypatch, tmp_path):
    calls, cache = _ok(monkeypatch, tmp_path)
    investigation_ai.generate_investigation_analysis("INV-F0001", _ctx(), cache_path=cache)
    changed = _ctx()
    changed["findings"].append(dict(changed["findings"][0], finding_id="F0002"))
    out = investigation_ai.generate_investigation_analysis(
        "INV-F0001", changed, cache_path=cache)
    assert out["cached"] is False
    assert len(calls) == 2


def test_missing_key_returns_unavailable_without_call(monkeypatch, tmp_path):
    calls = []
    monkeypatch.setattr(app_settings, "gemini_api_key", "")

    def fake_generate(prompt, config=None):
        calls.append(prompt)
        return VALID_AI_JSON

    monkeypatch.setattr(gemini_client, "generate_content", fake_generate)
    out = investigation_ai.generate_investigation_analysis(
        "INV-F0001", _ctx(), cache_path=tmp_path / "ai.json")
    assert out["status"] == "unavailable"
    assert "not configured" in out["model_metadata"]["reason"]
    assert calls == []
    assert out["executive_summary"] == ""  # nothing fabricated


def test_gemini_failure_returns_controlled_error(monkeypatch, tmp_path):
    monkeypatch.setattr(app_settings, "gemini_api_key", "test-key")

    def boom(prompt, config=None):
        raise gemini_client.GeminiAPIError("HTTP 500")

    monkeypatch.setattr(gemini_client, "generate_content", boom)
    out = investigation_ai.generate_investigation_analysis(
        "INV-F0001", _ctx(), cache_path=tmp_path / "ai.json")
    assert out["status"] == "error"
    assert "HTTP 500" in out["model_metadata"]["reason"]


def test_malformed_response_returns_controlled_error(monkeypatch, tmp_path):
    calls, cache = _ok(monkeypatch, tmp_path, payload="definitely not json {{{")
    _ = calls
    out = investigation_ai.generate_investigation_analysis(
        "INV-F0001", _ctx(), cache_path=cache)
    assert out["status"] == "error"


def test_fabricated_ids_yield_grounding_failed(monkeypatch, tmp_path):
    bad = VALID_AI_JSON.replace("TX000001", "TX999999")
    calls, cache = _ok(monkeypatch, tmp_path, payload=bad)
    _ = calls
    out = investigation_ai.generate_investigation_analysis(
        "INV-F0001", _ctx(), cache_path=cache)
    assert out["status"] == "grounding_failed"
    assert any("TX999999" in e for e in out["model_metadata"]["grounding_errors"])


def test_unknown_investigation_returns_error(monkeypatch, tmp_path):
    monkeypatch.setattr(app_settings, "gemini_api_key", "test-key")
    out = investigation_ai.generate_investigation_analysis(
        "INV-NOPE-999", None, cache_path=tmp_path / "ai.json")
    assert out["status"] == "error"
