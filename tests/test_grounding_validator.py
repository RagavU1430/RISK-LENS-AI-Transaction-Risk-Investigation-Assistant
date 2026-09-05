"""Phase 4 — grounding validator tests (no network, no key)."""

import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai_fixtures import VALID_AI_PAYLOAD, make_context  # noqa: E402
from backend.services.ai.grounding_validator import validate_grounding  # noqa: E402


def test_valid_references_accepted():
    result = validate_grounding(copy.deepcopy(VALID_AI_PAYLOAD), make_context())
    assert result["ok"], result["errors"]


def test_unknown_transaction_id_rejected():
    payload = copy.deepcopy(VALID_AI_PAYLOAD)
    payload["what_happened"] += " This customer also made transaction TX999999."
    result = validate_grounding(payload, make_context())
    assert not result["ok"]
    assert any("TX999999" in e for e in result["errors"])


def test_unknown_rule_id_rejected():
    payload = copy.deepcopy(VALID_AI_PAYLOAD)
    payload["why_flagged"] += " Rule R04 also fired."
    payload["rule_explanations"].append({
        "rule_id": "R04", "rule_name": "Other", "triggered": True,
        "explanation": "x", "transaction_ids": [], "evidence_references": []})
    result = validate_grounding(payload, make_context())
    assert not result["ok"]
    assert any("R04" in e for e in result["errors"])


def test_unknown_finding_id_rejected():
    payload = copy.deepcopy(VALID_AI_PAYLOAD)
    payload["executive_summary"] += " See finding F9999."
    result = validate_grounding(payload, make_context())
    assert not result["ok"]
    assert any("F9999" in e for e in result["errors"])


def test_unsupported_source_reference_rejected():
    payload = copy.deepcopy(VALID_AI_PAYLOAD)
    payload["source_references"].append({
        "source_type": "email", "source_id": "MSG1",
        "transaction_ids": [], "description": "x"})
    payload["source_references"].append({
        "source_type": "transaction", "source_id": "TX000007",
        "transaction_ids": ["TX000007"], "description": "x"})
    result = validate_grounding(payload, make_context())
    assert not result["ok"]
    assert len(result["errors"]) >= 2


def test_forbidden_verdict_rejected():
    payload = copy.deepcopy(VALID_AI_PAYLOAD)
    payload["executive_summary"] += " This is definitely fraud."
    result = validate_grounding(payload, make_context())
    assert not result["ok"]
