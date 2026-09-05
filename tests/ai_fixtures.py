"""Shared fixtures for Phase 4 AI tests (mocked Gemini, no network, no key)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

VALID_AI_PAYLOAD = {
    "executive_summary": "Customer C001 triggered R01 with TX000001.",
    "what_happened": "Transaction TX000001 moved 30000.0 to Amazon.",
    "why_flagged": "R01 triggered: amount is 6.0 times the customer median.",
    "behavioral_comparison": "Observed 30000.0 vs median 5000.0.",
    "rule_explanations": [{
        "rule_id": "R01", "rule_name": "Unusually Large Transaction",
        "triggered": True, "explanation": "TX000001 exceeded 5x median.",
        "transaction_ids": ["TX000001"], "evidence_references": ["F0001"],
    }],
    "key_evidence": [{
        "title": "Large amount", "observation": "TX000001 is 6.0x median.",
        "supporting_transaction_ids": ["TX000001"],
        "baseline_reference": "CUSTOMER-C001 median",
        "calculation_reference": "amount / customer_median = 6.0",
    }],
    "analyst_considerations": ["Verify TX000001 against known obligations."],
    "uncertainty": "Intent cannot be determined from the evidence.",
    "source_references": [
        {"source_type": "transaction", "source_id": "TX000001",
         "transaction_ids": ["TX000001"], "description": "Primary transaction"},
        {"source_type": "finding", "source_id": "F0001",
         "transaction_ids": ["TX000001"], "description": "Deterministic R01 finding"},
        {"source_type": "baseline", "source_id": "CUSTOMER-C001",
         "transaction_ids": [], "description": "Customer amount baseline"},
    ],
}

VALID_AI_JSON = json.dumps(VALID_AI_PAYLOAD)


def make_context():
    return {
        "investigation_id": "INV-F0001",
        "customer_id": "C001",
        "finding_ids": ["F0001"],
        "customer_profile": {"customer_id": "C001", "customer_name": "Test User"},
        "findings": [{
            "finding_id": "F0001", "customer_id": "C001", "rule_id": "R01",
            "rule_name": "Unusually Large Transaction", "severity": "HIGH",
            "transaction_ids": ["TX000001"], "detected_at": "2026-04-01T10:00:00",
            "summary": "Unusually large transaction.",
            "evidence": {"amount": 30000.0, "customer_median": 5000.0, "ratio": 6.0},
            "baseline": {"metric": "median_transaction_amount", "value": 5000.0},
            "calculation": {"formula": "amount / customer_median", "result": 6.0},
            "traceability": {"source": "data/transactions.csv",
                             "transaction_ids": ["TX000001"]},
        }],
        "evidence_packages": [{
            "finding_id": "F0001", "customer_id": "C001", "rule_id": "R01",
            "primary_transactions": [{
                "transaction_id": "TX000001", "customer_id": "C001",
                "timestamp": "2026-04-01T10:00:00", "date": "2026-04-01",
                "time": "10:00:00", "description": "Test", "payee": "Amazon",
                "amount": 30000.0, "channel": "UPI", "transaction_type": "PURCHASE"}],
            "related_transactions": [{
                "transaction_id": "TX000002", "customer_id": "C001",
                "timestamp": "2026-04-01T11:00:00", "date": "2026-04-01",
                "time": "11:00:00", "description": "Test", "payee": "Swiggy",
                "amount": 500.0, "channel": "UPI", "transaction_type": "DINING"}],
            "customer_context": {"customer_id": "C001", "median_amount": 5000.0},
            "payee_context": {}, "temporal_context": {},
            "baseline_comparison": {"observed": 30000.0, "baseline": 5000.0},
            "calculation": {"formula": "amount / customer_median", "result": 6.0},
            "source_traceability": {"transaction_ids": ["TX000001"]},
        }],
    }
