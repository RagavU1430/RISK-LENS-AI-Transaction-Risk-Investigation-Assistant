"""Phase 4 — prompt builder tests (no network, no key)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai_fixtures import make_context  # noqa: E402
from backend.services.ai.investigation_prompt import (  # noqa: E402
    OUTPUT_REQUIREMENTS,
    SYSTEM_INSTRUCTION,
    build_investigation_prompt,
)


def test_prompt_contains_grounding_instructions():
    prompt = build_investigation_prompt(make_context())
    assert "EXPLAIN deterministic" in prompt
    assert "Insufficient evidence in the supplied investigation context" in prompt
    assert "committed fraud" in prompt  # forbidden wording is explicit
    assert "rule_explanations" in prompt and "source_references" in prompt


def test_prompt_embeds_context_facts():
    prompt = build_investigation_prompt(make_context())
    assert "TX000001" in prompt
    assert "R01" in prompt
    assert "6.0" in prompt
    assert "INV-F0001" in prompt


def test_prompt_leaks_no_secrets():
    prompt = build_investigation_prompt(make_context())
    assert "GEMINI_API_KEY" not in prompt
    assert "AQ.Ab8" not in prompt
    assert SYSTEM_INSTRUCTION and OUTPUT_REQUIREMENTS
