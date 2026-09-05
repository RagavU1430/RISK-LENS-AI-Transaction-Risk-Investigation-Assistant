"""Phase 4 — response parser tests (no network, no key)."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai_fixtures import VALID_AI_JSON  # noqa: E402
from backend.services.ai.response_parser import AIParseError, parse_ai_response  # noqa: E402


def test_valid_json_parses_with_stamped_ids():
    report = parse_ai_response(VALID_AI_JSON, "INV-F0001", "C001")
    assert report.status == "complete"
    assert report.investigation_id == "INV-F0001"
    assert report.customer_id == "C001"
    assert report.rule_explanations[0].rule_id == "R01"


def test_markdown_fences_parsed():
    fenced = "```json\n" + VALID_AI_JSON + "\n```"
    report = parse_ai_response(fenced, "INV-F0001", "C001")
    assert report.executive_summary != ""


def test_invalid_json_rejected():
    with pytest.raises(AIParseError):
        parse_ai_response("not json at all {{{", "INV-F0001", "C001")


def test_invalid_schema_rejected():
    with pytest.raises(AIParseError):
        parse_ai_response('{"rule_explanations": "should-be-a-list"}',
                          "INV-F0001", "C001")
    with pytest.raises(AIParseError):
        parse_ai_response('["a", "list"]', "INV-F0001", "C001")


def test_ids_stamped_from_context_not_model():
    doctored = VALID_AI_JSON.replace("INV-F0001", "INV-WRONG")
    report = parse_ai_response(doctored, "INV-F0001", "C001")
    assert report.investigation_id == "INV-F0001"
