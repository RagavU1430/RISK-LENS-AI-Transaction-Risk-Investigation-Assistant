"""Phase 4 — AI API tests with mocked Gemini (no network, no key)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import app  # noqa: E402
from backend.config import settings as app_settings  # noqa: E402
from backend.services.ai import gemini_client, investigation_ai  # noqa: E402

client = TestClient(app)


def _payload_for(inv):
    """Build a grounded mock AI payload from a real investigation context."""
    finding = inv["findings"][0]
    tid = finding["transaction_ids"][0]
    rid = finding["rule_id"]
    fid = inv["finding_ids"][0]
    cid = inv["customer_id"]
    return json.dumps({
        "executive_summary": f"Customer {cid} triggered {rid} with {tid}.",
        "what_happened": f"Transaction {tid} is the primary record.",
        "why_flagged": f"{rid} triggered per the deterministic finding.",
        "behavioral_comparison": "Observed activity differs from baseline.",
        "rule_explanations": [{
            "rule_id": rid, "rule_name": finding.get("rule_name", ""),
            "triggered": True, "explanation": f"{rid} fired on {tid}.",
            "transaction_ids": [tid], "evidence_references": [fid]}],
        "key_evidence": [{
            "title": "Primary record", "observation": f"{tid} supports the finding.",
            "supporting_transaction_ids": [tid],
            "baseline_reference": f"CUSTOMER-{cid} baseline",
            "calculation_reference": "supplied deterministic calculation"}],
        "analyst_considerations": [f"Verify {tid} against known obligations."],
        "uncertainty": "Intent cannot be determined from the evidence.",
        "source_references": [
            {"source_type": "transaction", "source_id": tid,
             "transaction_ids": [tid], "description": "Primary transaction"},
            {"source_type": "finding", "source_id": fid,
             "transaction_ids": [tid], "description": "Deterministic finding"},
            {"source_type": "baseline", "source_id": f"CUSTOMER-{cid}",
             "transaction_ids": [], "description": "Customer baseline"}],
    })


def _mock_success(monkeypatch, tmp_path, calls, payload=None):
    monkeypatch.setattr(app_settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(app_settings, "gemini_model", "test-model")
    monkeypatch.setattr(investigation_ai, "DEFAULT_CACHE_PATH", tmp_path / "ai.json")

    def fake_generate(prompt, config=None):
        calls.append(True)
        return payload if payload is not None else _payload_for(
            client.get("/api/v1/investigations/INV-F0001").json())

    monkeypatch.setattr(gemini_client, "generate_content", fake_generate)


def test_investigation_not_found_404():
    assert client.get("/api/v1/investigations/INV-NOPE-999/analysis").status_code == 404
    assert client.post("/api/v1/investigations/INV-NOPE-999/analysis").status_code == 404


def test_no_key_returns_unavailable(monkeypatch):
    monkeypatch.setattr(app_settings, "gemini_api_key", "")
    # refresh=true bypasses any cached report to exercise the no-key path.
    body = client.get("/api/v1/investigations/INV-F0001/analysis?refresh=true").json()
    assert body["status"] == "unavailable"
    assert body["investigation_id"] == "INV-F0001"
    assert body["executive_summary"] == ""  # nothing fabricated
    # Deterministic data untouched by AI absence.
    assert client.get("/api/v1/investigations/INV-F0001").status_code == 200


def test_mocked_analysis_complete_then_cached(monkeypatch, tmp_path):
    calls = []
    _mock_success(monkeypatch, tmp_path, calls)
    first = client.get("/api/v1/investigations/INV-F0001/analysis").json()
    assert first["status"] == "complete"
    assert first["cached"] is False
    assert first["model_metadata"]["model"] == "test-model"
    second = client.get("/api/v1/investigations/INV-F0001/analysis").json()
    assert second["cached"] is True
    assert len(calls) == 1


def test_post_forces_regeneration(monkeypatch, tmp_path):
    calls = []
    _mock_success(monkeypatch, tmp_path, calls)
    client.get("/api/v1/investigations/INV-F0001/analysis")
    body = client.post("/api/v1/investigations/INV-F0001/analysis").json()
    assert body["status"] == "complete"
    assert body["cached"] is False
    assert len(calls) == 2


def test_customer_investigation_analysis(monkeypatch, tmp_path):
    calls = []
    inv = client.get("/api/v1/customers/C001/investigation").json()
    _mock_success(monkeypatch, tmp_path, calls, payload=_payload_for(inv))
    body = client.get("/api/v1/investigations/INV-C001/analysis").json()
    assert body["status"] == "complete"
    assert body["customer_id"] == "C001"
    assert len(calls) == 1
