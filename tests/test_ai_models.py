"""Phase 4 — AI pydantic model tests (no network, no key)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai_fixtures import VALID_AI_PAYLOAD  # noqa: E402
from backend.models import (  # noqa: E402
    EvidenceExplanation,
    InvestigationAIReport,
    RuleExplanation,
    SourceReference,
)


def test_full_report_validates():
    report = InvestigationAIReport.model_validate(
        {"investigation_id": "INV-F0001", "customer_id": "C001", **VALID_AI_PAYLOAD})
    assert report.status == "complete"
    assert len(report.rule_explanations) == 1
    assert report.rule_explanations[0].rule_id == "R01"
    assert len(report.source_references) == 3


def test_minimal_report_uses_safe_defaults():
    report = InvestigationAIReport.model_validate({"investigation_id": "INV-F0001"})
    assert report.customer_id == ""
    assert report.rule_explanations == []
    assert report.source_references == []
    assert report.status == "complete"


def test_submodel_defaults():
    rule = RuleExplanation.model_validate({"rule_id": "R03"})
    assert rule.triggered is True
    assert rule.transaction_ids == []
    ev = EvidenceExplanation.model_validate({"title": "t"})
    assert ev.supporting_transaction_ids == []
    src = SourceReference.model_validate({"source_type": "finding", "source_id": "F0001"})
    assert src.transaction_ids == []


def test_missing_investigation_id_defaults_for_context_stamping():
    # The model omits IDs; the orchestrator stamps authoritative IDs
    # from the deterministic context after validation.
    report = InvestigationAIReport.model_validate({"customer_id": "C001"})
    assert report.investigation_id == ""
