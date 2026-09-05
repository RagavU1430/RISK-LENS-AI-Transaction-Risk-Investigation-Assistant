"""Phase 2 tests — deterministic risk engine. No Gemini, RAG, or LLM."""

import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.config import settings
from backend.services import data_loader
from backend.services.finding_validation import validate_findings
from backend.services.risk_engine import run_customer, run_engine
from backend.services.rules import (
    r01_large_transaction,
    r02_new_payee_burst,
    r03_odd_hours,
    r04_behavioral_deviation,
    r05_transaction_burst,
)

CID = "C001"


def _tx(tid, ts, amount, payee="Amazon", channel="UPI", ttype="PURCHASE"):
    dt = datetime.fromisoformat(ts)
    return {
        "transaction_id": tid, "customer_id": CID, "timestamp": ts,
        "date": dt.strftime("%Y-%m-%d"), "time": dt.strftime("%H:%M:%S"),
        "description": "Test", "payee": payee, "amount": amount,
        "channel": channel, "transaction_type": ttype,
    }


def _base(median=5000.0, mean=6000.0, std=2000.0):
    return {
        "median_amount": median, "average_amount": mean, "standard_deviation": std,
        "total_transactions": 100, "time_distribution": {
            "06:00-10:00": 15.0, "10:00-14:00": 30.0, "14:00-18:00": 25.0,
            "18:00-22:00": 25.0, "22:00-06:00": 5.0},
    }


# ---------------- R01 ----------------

def test_r01_below_threshold_no_finding():
    txs = [_tx("TX000001", "2026-04-01T10:00:00", 20000.0)]
    out = r01_large_transaction.evaluate(CID, txs, _base(median=5000.0), {}, settings)
    assert out == []


def test_r01_exactly_5x_no_finding():
    txs = [_tx("TX000001", "2026-04-01T10:00:00", 25000.0)]
    out = r01_large_transaction.evaluate(CID, txs, _base(median=5000.0), {}, settings)
    assert out == []


def test_r01_above_threshold_finding_ratio_and_id():
    txs = [_tx("TX000042", "2026-04-01T10:00:00", 30000.0)]
    out = r01_large_transaction.evaluate(CID, txs, _base(median=5000.0), {}, settings)
    assert len(out) == 1
    f = out[0]
    assert f["rule_id"] == "R01"
    assert f["transaction_ids"] == ["TX000042"]
    assert f["evidence"]["ratio"] == 6.0
    assert f["calculation"]["result"] == 6.0
    assert f["traceability"]["transaction_ids"] == ["TX000042"]
    assert "fraud" not in f["summary"].lower()


# ---------------- R02 ----------------

def _burst(payee, start_ts, amounts, step_min=5, tid_prefix="TXB"):
    start = datetime.fromisoformat(start_ts)
    return [_tx(f"{tid_prefix}{i:03d}", (start + timedelta(minutes=step_min * i)).isoformat(),
                amt, payee=payee) for i, amt in enumerate(amounts)]


def test_r02_existing_payee_no_finding():
    old = [_tx("TX000001", "2026-03-01T10:00:00", 500.0, payee="Swiggy"),
           _tx("TX000002", "2026-03-05T10:00:00", 600.0, payee="Swiggy")]
    burst = _burst("Swiggy", "2026-04-01T10:00:00", [1000.0, 2000.0, 1500.0], step_min=5)
    out = r02_new_payee_burst.evaluate(CID, old + burst, _base(), {}, settings)
    assert out == []


def test_r02_new_payee_two_transactions_no_finding():
    txs = _burst("NewPayeeX", "2026-04-01T10:01:00", [1000.0, 2000.0], step_min=6)
    out = r02_new_payee_burst.evaluate(CID, txs, _base(), {}, settings)
    assert out == []


def test_r02_new_payee_three_within_15min_finding():
    txs = _burst("PayeeX", "2026-04-01T10:01:00", [1000.0, 2000.0, 1500.0], step_min=6)
    out = r02_new_payee_burst.evaluate(CID, txs, _base(), {}, settings)
    assert len(out) == 1
    f = out[0]
    assert f["rule_id"] == "R02"
    assert f["transaction_ids"] == [t["transaction_id"] for t in txs]
    assert f["evidence"]["transaction_count"] == 3
    assert f["evidence"]["payee"] == "PayeeX"


def test_r02_three_outside_15min_no_finding():
    txs = _burst("PayeeY", "2026-04-01T10:00:00", [1000.0, 2000.0, 1500.0], step_min=20)
    out = r02_new_payee_burst.evaluate(CID, txs, _base(), {}, settings)
    assert out == []


# ---------------- R03 ----------------

def test_r03_daytime_no_finding():
    txs = [_tx("TX000001", "2026-04-01T10:30:00", 500.0)]
    out = r03_odd_hours.evaluate(CID, txs, _base(), {}, settings)
    assert out == []


def test_r03_overnight_finding_with_timestamp_evidence():
    txs = [_tx("TX000009", "2026-04-01T02:15:00", 500.0)]
    out = r03_odd_hours.evaluate(CID, txs, _base(), {}, settings)
    assert len(out) == 1
    f = out[0]
    assert f["rule_id"] == "R03"
    assert f["evidence"]["hour"] == 2
    assert f["evidence"]["timestamp"] == "2026-04-01T02:15:00"
    assert "time_distribution" in f["evidence"] or "customer_time_distribution" in f["evidence"]


def test_r03_regular_overnight_customer_low_severity():
    # 50% overnight history → LOW severity but still a finding (deterministic).
    txs = [_tx(f"TXN{i:04d}", f"2026-04-{(i % 20) + 1:02d}T02:1{i % 10}:00", 500.0)
           for i in range(20)]
    txs += [_tx(f"TXD{i:04d}", f"2026-04-{(i % 20) + 1:02d}T12:00:00", 500.0)
            for i in range(20)]
    out = r03_odd_hours.evaluate(CID, txs, _base(), {}, settings)
    assert len(out) == 20
    assert all(f["severity"] == "LOW" for f in out)


# ---------------- R04 ----------------

def test_r04_normal_no_finding():
    txs = [_tx("TX000001", "2026-04-01T10:00:00", 5200.0)]
    out = r04_behavioral_deviation.evaluate(CID, txs, _base(mean=5000.0, std=1000.0), {}, settings)
    assert out == []


def test_r04_extreme_finding_correct_z():
    txs = [_tx("TX000077", "2026-04-01T10:00:00", 10000.0)]
    out = r04_behavioral_deviation.evaluate(CID, txs, _base(mean=5000.0, std=1000.0), {}, settings)
    assert len(out) == 1
    assert out[0]["calculation"]["result"] == 5.0
    assert out[0]["transaction_ids"] == ["TX000077"]


def test_r04_std_fallback_triggers():
    base = _base(median=1000.0, mean=1000.0, std=0.0)
    txs = [_tx("TX000001", "2026-04-01T10:00:00", 1000.0),
           _tx("TX000002", "2026-04-02T10:00:00", 1000.0),
           _tx("TX000003", "2026-04-03T10:00:00", 1000.0),
           _tx("TX000099", "2026-04-04T10:00:00", 5000.0)]
    out = r04_behavioral_deviation.evaluate(CID, txs, base, {}, settings)
    assert any(f["transaction_ids"] == ["TX000099"] for f in out)
    assert out[0]["calculation"]["method"] in ("mad_fallback", "median_ratio_fallback")


# ---------------- R05 ----------------

def _background(n, start_day=1):
    txs = []
    for i in range(n):
        day = (start_day + i) % 28 + 1
        txs.append(_tx(f"TXG{i:04d}", f"2026-04-{day:02d}T12:00:00", 500.0 + i))
    return txs


def test_r05_normal_frequency_no_finding():
    txs = _background(10)
    out = r05_transaction_burst.evaluate(CID, txs, _base(), {}, settings)
    assert out == []


def test_r05_burst_above_threshold_finding():
    txs = _background(50) + _burst("Amazon", "2026-05-01T10:00:00",
                                   [500.0] * 7, step_min=1, tid_prefix="TXR")
    out = r05_transaction_burst.evaluate(CID, txs, _base(), {}, settings)
    assert len(out) >= 1
    f = out[0]
    assert f["rule_id"] == "R05"
    assert f["evidence"]["transaction_count"] >= 5
    assert f["evidence"]["threshold"] >= 5


def test_r05_exactly_at_threshold_triggers():
    txs = _background(50) + _burst("Amazon", "2026-05-01T10:00:00",
                                   [500.0] * 5, step_min=1, tid_prefix="TXE")
    out = r05_transaction_burst.evaluate(CID, txs, _base(), {}, settings)
    assert len(out) >= 1
    assert out[0]["evidence"]["transaction_count"] >= out[0]["evidence"]["threshold"]


def test_r05_outside_window_no_finding():
    txs = _background(10) + _burst("Amazon", "2026-05-01T10:00:00",
                                   [500.0] * 5, step_min=20, tid_prefix="TXO")
    out = r05_transaction_burst.evaluate(CID, txs, _base(), {}, settings)
    # 20-min spacing → no 30-min window holds >= 5.
    assert out == []


def test_r05_correct_window_ids():
    burst = _burst("Amazon", "2026-05-01T10:00:00", [500.0] * 7,
                   step_min=1, tid_prefix="TXW")
    txs = _background(50) + burst
    out = r05_transaction_burst.evaluate(CID, txs, _base(), {}, settings)
    assert out
    burst_ids = {t["transaction_id"] for t in burst}
    assert set(out[0]["transaction_ids"]).issubset(burst_ids)


# ---------------- Cross-cutting ----------------

def test_rule_independence_one_tx_multiple_rules():
    txs = [_tx("TX090001", "2026-04-01T02:30:00", 50000.0, payee="Amazon", channel="UPI")]
    base = _base(median=5000.0, mean=6000.0, std=2000.0)
    out = run_customer(CID, txs, base, {}, None, settings)
    rule_ids = {f["rule_id"] for f in out}
    assert "R01" in rule_ids  # 10x median
    assert "R03" in rule_ids  # 02:30 overnight
    assert "R04" in rule_ids  # z = 22
    # Same transaction preserved in each finding.
    for f in out:
        if f["rule_id"] in ("R01", "R03", "R04"):
            assert "TX090001" in f["transaction_ids"]


def test_deterministic_repeated_execution():
    txs = data_loader.load_transactions()[:1500]
    baselines = data_loader.load_customer_baselines()
    pay = data_loader.load_payee_baselines()
    a = run_engine(txs, baselines, pay, None, settings)
    b = run_engine(txs, baselines, pay, None, settings)
    assert a == b
    assert len({f["finding_id"] for f in a}) == len(a)


def test_finding_validation_and_traceability():
    txs = data_loader.load_transactions()
    custs = data_loader.load_customers()
    import json
    doc = json.load(open(Path(__file__).resolve().parents[1] / "data" / "findings.json"))
    findings = doc["findings"]
    assert findings
    result = validate_findings(findings, txs, custs)
    assert result["valid"], result["errors"][:5]
    tx_ids = {t["transaction_id"] for t in txs}
    for f in findings[:50]:
        for tid in f["transaction_ids"]:
            assert tid in tx_ids
        assert f["traceability"]["source"] == "data/transactions.csv"
