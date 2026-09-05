"""Phase 3 tests — deterministic evidence & investigation context.

No Gemini, RAG, embeddings, or LLM. Proves every package traces back
to real findings and real source transactions.
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import app  # noqa: E402
from backend.services import data_loader  # noqa: E402
from backend.services.evidence_engine import (  # noqa: E402
    MAX_RELATED,
    build_all_evidence,
    build_evidence_for_finding,
    build_investigation_contexts,
)
from backend.services.evidence_validation import validate_evidence  # noqa: E402
from backend.services.rules import r02_new_payee_burst, r05_transaction_burst  # noqa: E402

client = TestClient(app)
CID = "C001"


def _tx(tid, ts, amount, payee="Amazon", channel="UPI", cid=CID):
    dt = datetime.fromisoformat(ts)
    return {"transaction_id": tid, "customer_id": cid, "timestamp": ts,
            "date": dt.strftime("%Y-%m-%d"), "time": dt.strftime("%H:%M:%S"),
            "description": "Test", "payee": payee, "amount": amount,
            "channel": channel, "transaction_type": "PURCHASE"}


def _real():
    txs = data_loader.load_transactions()
    custs = data_loader.load_customers()
    base = data_loader.load_customer_baselines()
    pay = data_loader.load_payee_baselines()
    findings = data_loader.load_findings().get("findings", [])
    return txs, custs, base, pay, findings


def _pkg_for_rule(rule_id):
    txs, custs, base, pay, findings = _real()
    f = next(x for x in findings if x["rule_id"] == rule_id)
    pkg = build_evidence_for_finding(
        f, [t for t in txs if t["customer_id"] == f["customer_id"]],
        base.get(f["customer_id"], {}), pay.get(f["customer_id"], {}))
    return f, pkg


def test_evidence_generation_covers_all_findings():
    txs, custs, base, pay, findings = _real()
    packages = build_all_evidence(findings, txs, base, pay, custs)
    assert len(packages) == len(findings) == 766
    assert {p["finding_id"] for p in packages} == {f["finding_id"] for f in findings}


def test_r01_evidence():
    f, pkg = _pkg_for_rule("R01")
    assert pkg["primary_transactions"]
    bc = pkg["baseline_comparison"]
    assert bc["ratio"] > 5 and bc["rule_result"] == "TRIGGERED"
    assert bc["difference"] == round(bc["observed"] - bc["baseline"], 2)
    assert pkg["calculation"]["triggered"] is True


def test_r02_evidence_synthetic_new_payee():
    start = datetime(2026, 4, 1, 10, 1)
    txs = [_tx(f"TXN{i:03d}", (start + timedelta(minutes=6 * i)).isoformat(),
               [1000.0, 2000.0, 1500.0][i], payee="PayeeX") for i in range(3)]
    findings = r02_new_payee_burst.evaluate(CID, txs, {}, {}, None)
    assert len(findings) == 1
    findings[0]["finding_id"] = "F9001"
    pkg = build_evidence_for_finding(findings[0], txs, {}, {}, None)
    assert len(pkg["primary_transactions"]) == 3
    payee = pkg["payee_context"]["payees"]["PayeeX"]
    assert payee["known_before_finding"] is False
    assert payee["historical_transaction_count"] == 3
    assert pkg["baseline_comparison"]["rule_result"] == "TRIGGERED"


def test_r03_evidence():
    f, pkg = _pkg_for_rule("R03")
    tc = pkg["temporal_context"]
    assert 0 <= tc["hour"] < 5
    assert tc["time_distribution"]
    assert tc["anchor_bucket_pct"] is not None


def test_r04_evidence():
    f, pkg = _pkg_for_failure_free_r04()
    assert pkg["calculation"]["method"] in ("z_score", "mad_fallback", "median_ratio_fallback")
    assert pkg["baseline_comparison"]["rule_result"] == "TRIGGERED"


def _pkg_for_failure_free_r04():
    txs, custs, base, pay, findings = _real()
    f = next(x for x in findings if x["rule_id"] == "R04")
    pkg = build_evidence_for_finding(
        f, [t for t in txs if t["customer_id"] == f["customer_id"]],
        base.get(f["customer_id"], {}), pay.get(f["customer_id"], {}))
    return f, pkg


def test_r05_evidence_synthetic_burst():
    bg = [_tx(f"TXG{i:04d}", f"2026-04-{(i % 28) + 1:02d}T12:00:00", 500.0 + i)
          for i in range(50)]
    start = datetime(2026, 5, 1, 10, 0)
    burst = [_tx(f"TXR{i:03d}", (start + timedelta(minutes=i)).isoformat(), 500.0)
             for i in range(7)]
    txs = bg + burst
    findings = r05_transaction_burst.evaluate(CID, txs, {}, {}, None)
    assert findings
    findings[0]["finding_id"] = "F9002"
    pkg = build_evidence_for_finding(findings[0], txs, {}, {}, None)
    assert pkg["baseline_comparison"]["observed_count"] >= 5
    assert pkg["baseline_comparison"]["threshold"] >= 5
    assert len(pkg["primary_transactions"]) >= 5


def test_primary_transaction_retrieval_exact():
    txs, custs, base, pay, findings = _real()
    f = findings[0]
    pkg = build_evidence_for_finding(
        f, txs, base.get(f["customer_id"], {}), pay.get(f["customer_id"], {}))
    assert [t["transaction_id"] for t in pkg["primary_transactions"]] == f["transaction_ids"]
    by_id = {t["transaction_id"]: t for t in txs}
    for t in pkg["primary_transactions"]:
        assert float(t["amount"]) == float(by_id[t["transaction_id"]]["amount"])


def test_related_transactions_nearby_capped_excludes_primary():
    f, pkg = _pkg_for_rule("R01")
    primary_ids = {t["transaction_id"] for t in pkg["primary_transactions"]}
    related_ids = [t["transaction_id"] for t in pkg["related_transactions"]]
    assert len(related_ids) <= MAX_RELATED
    assert not (set(related_ids) & primary_ids)
    anchor = datetime.fromisoformat(pkg["temporal_context"]["anchor_timestamp"])
    for t in pkg["related_transactions"]:
        assert abs((datetime.fromisoformat(t["timestamp"]) - anchor).total_seconds()) <= 24 * 3600
        assert t["customer_id"] == f["customer_id"]


def test_customer_context():
    f, pkg = _pkg_for_rule("R01")
    cc = pkg["customer_context"]
    assert cc["customer_id"] == f["customer_id"]
    assert cc["median_amount"] and cc["total_transactions"] > 0
    assert cc["normal_channels"] and cc["normal_payees"] and cc["time_distribution"]


def test_payee_context_existing_payee_chronology():
    f, pkg = _pkg_for_rule("R01")
    payees = pkg["payee_context"]["payees"]
    assert payees
    for name, p in payees.items():
        assert p["historical_transaction_count"] >= 1
        assert p["first_seen"] <= p["last_seen"]


def test_temporal_context_fields():
    f, pkg = _pkg_for_rule("R03")
    tc = pkg["temporal_context"]
    for key in ["anchor_timestamp", "date", "time", "hour", "day_of_week",
                "weekday_weekend", "nearby_24h_count", "anchor_bucket"]:
        assert key in tc
    assert tc["weekday_weekend"] in ("weekday", "weekend")


def test_baseline_comparison_matches_phase2():
    txs, custs, base, pay, findings = _real()
    for f in findings[:100]:
        pkg = build_evidence_for_finding(
            f, [t for t in txs if t["customer_id"] == f["customer_id"]],
            base.get(f["customer_id"], {}), pay.get(f["customer_id"], {}))
        assert pkg["calculation"]["formula"] == f["calculation"]["formula"]
        assert pkg["calculation"]["result"] == f["calculation"]["result"]


def test_traceability_valid():
    f, pkg = _pkg_for_rule("R04")
    trace = pkg["source_traceability"]
    assert trace["transaction_source"] == "data/transactions.csv"
    assert trace["finding_id"] == f["finding_id"]
    assert set(trace["transaction_ids"]) == set(f["transaction_ids"])


def test_evidence_validation_passes():
    txs, custs, base, pay, findings = _real()
    doc = data_loader.load_evidence()
    result = validate_evidence(doc["evidence_packages"], findings, txs, custs)
    assert result["valid"], result["errors"][:5]
    assert result["packages"] == len(findings)


def test_deterministic_output():
    txs, custs, base, pay, findings = _real()
    a = build_all_evidence(findings, txs, base, pay, custs)
    b = build_all_evidence(findings, txs, base, pay, custs)
    assert a == b
    ca = build_investigation_contexts(findings, a, custs)
    cb = build_investigation_contexts(findings, b, custs)
    assert ca == cb


def test_api_evidence_filters():
    r = client.get("/api/v1/evidence?finding_id=F0001")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["evidence_packages"][0]["finding_id"] == "F0001"
    r = client.get("/api/v1/evidence?rule_id=R03")
    assert r.status_code == 200
    assert r.json()["total"] == 69
    r = client.get("/api/v1/evidence?customer_id=C001&rule_id=R01")
    assert r.status_code == 200
    assert r.json()["total"] > 0


def test_api_investigation_by_id():
    r = client.get("/api/v1/investigations/INV-F0001")
    assert r.status_code == 200
    body = r.json()
    assert body["investigation_id"] == "INV-F0001"
    assert body["finding_ids"] == ["F0001"]
    assert body["evidence_packages"][0]["finding_id"] == "F0001"
    assert client.get("/api/v1/investigations/NOPE-999").status_code == 404


def test_api_empty_customer_investigation():
    r = client.get("/api/v1/customers/C999/investigation")
    assert r.status_code == 200
    body = r.json()
    assert body["finding_ids"] == [] and body["findings"] == []
    assert body["evidence_packages"] == []


def test_api_multiple_findings_per_customer():
    r = client.get("/api/v1/customers/C001/investigation")
    assert r.status_code == 200
    body = r.json()
    assert len(body["finding_ids"]) > 1
    assert {f["finding_id"] for f in body["findings"]} == set(body["finding_ids"])
    assert {p["finding_id"] for p in body["evidence_packages"]} == set(body["finding_ids"])
