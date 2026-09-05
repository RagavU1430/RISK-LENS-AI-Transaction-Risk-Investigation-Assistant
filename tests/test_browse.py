"""Phase 5 — contract tests for read-only browse endpoints (no logic changes)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import app  # noqa: E402

client = TestClient(app)


def test_investigations_summary_shape_and_stats():
    body = client.get("/api/v1/investigations?limit=5").json()
    assert body["total"] == 766
    assert body["stats"]["findings"] == 766
    assert body["stats"]["investigations"] == 766
    assert set(body["stats"]["by_rule"]) == {"R01", "R03", "R04"}
    item = body["investigations"][0]
    for key in ["investigation_id", "customer_id", "finding_ids", "rules",
                "severities", "max_severity", "transaction_count",
                "transaction_ids", "detected_at"]:
        assert key in item, key


def test_investigations_filters():
    assert client.get("/api/v1/investigations?severity=HIGH").json()["total"] > 0
    r01 = client.get("/api/v1/investigations?rule_id=R01").json()
    assert r01["total"] == 548
    assert all(any(r["rule_id"] == "R01" for r in i["rules"]) for i in r01["investigations"][:20])
    c001 = client.get("/api/v1/investigations?customer_id=C001").json()
    assert c001["total"] == 44
    assert client.get("/api/v1/investigations?search=inv-f0001").json()["total"] == 1


def test_transactions_pagination_and_filters():
    first = client.get("/api/v1/transactions?limit=10").json()
    assert first["total"] == 8966
    assert len(first["transactions"]) == 10
    assert "triggered_rules" in first["transactions"][0]
    flagged = client.get("/api/v1/transactions?risk=flagged&limit=5").json()
    assert flagged["total"] > 0
    assert all(t["triggered_rules"] for t in flagged["transactions"])
    normal = client.get("/api/v1/transactions?risk=normal&limit=5").json()
    assert all(t["triggered_rules"] == [] for t in normal["transactions"])
    cust = client.get("/api/v1/transactions?customer_id=C001&limit=200").json()
    assert cust["total"] > 300 and all(t["customer_id"] == "C001" for t in cust["transactions"])
    assert client.get("/api/v1/transactions?search=TX000006&limit=5").json()["total"] >= 1


def test_transaction_detail_with_rule_refs():
    body = client.get("/api/v1/transactions/TX000006").json()
    assert body["transaction_id"] == "TX000006"
    assert "R01" in body["triggered_rules"]
    assert "F0001" in body["finding_ids"]
    assert "INV-F0001" in body["investigation_ids"]
    assert client.get("/api/v1/transactions/TX-NOPE").status_code == 404


def test_customers_list():
    body = client.get("/api/v1/customers").json()
    assert body["total"] == 20
    c001 = next(c for c in body["customers"] if c["customer_id"] == "C001")
    assert c001["finding_count"] == 44
    assert c001["customer_name"]


def test_ai_status_has_no_secret():
    body = client.get("/api/v1/ai/status").json()
    assert set(body) == {"available", "model", "reason"}
    assert isinstance(body["available"], bool)
    assert "key" not in " ".join(body.keys()).lower()
    assert "AQ." not in str(body) and "AIza" not in str(body)


def test_evidence_summary_backwards_compatible():
    full = client.get("/api/v1/evidence?finding_id=F0001").json()
    assert full["total"] == 1
    assert "primary_transactions" in full["evidence_packages"][0]
    slim = client.get("/api/v1/evidence?finding_id=F0001&summary=true").json()
    assert slim["total"] == 1
    item = slim["evidence_packages"][0]
    assert item["investigation_id"] == "INV-F0001"
    assert item["severity"] == "HIGH" and item["rule_id"] == "R01"
    assert item["primary_count"] >= 1
