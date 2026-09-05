"""Phase 1 tests — data foundation only. No risk, no Gemini, no RAG."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.services.baseline import (
    calculate_all_baselines,
    calculate_customer_baseline,
    calculate_payee_baselines,
)
from backend.services.data_generator import SEED, generate_dataset
from backend.services.data_loader import (
    load_customer_baselines,
    load_customers,
    load_payee_baselines,
    load_transactions,
)
from backend.services.data_validation import REQUIRED_COLUMNS, validate_dataset

BASE_DIR = Path(__file__).resolve().parents[1]


def _files():
    txs = load_transactions()
    custs = load_customers()
    assert txs, "data/transactions.csv missing or empty — run python scripts/generate_data.py"
    assert custs, "data/customers.csv missing or empty"
    return txs, custs


def test_01_dataset_files_exist():
    for name in ["transactions.csv", "customers.csv", "customer_baselines.json",
                 "payee_baselines.json", "dataset_metadata.json"]:
        assert (BASE_DIR / "data" / name).exists(), f"data/{name} missing"


def test_02_dataset_generation_scales():
    txs, custs = _files()
    assert len(custs) == 20
    assert 8000 <= len(txs) <= 12000
    # Several months of history.
    months = {t["date"][:7] for t in txs}
    assert len(months) >= 5


def test_03_transaction_id_uniqueness():
    txs, _ = _files()
    ids = [t["transaction_id"] for t in txs]
    assert len(ids) == len(set(ids))


def test_04_customer_references():
    txs, custs = _files()
    valid = {c["customer_id"] for c in custs}
    for t in txs:
        assert t["customer_id"] in valid


def test_05_required_columns_and_amounts():
    txs, _ = _files()
    for t in txs:
        for col in REQUIRED_COLUMNS:
            assert col in t and t[col] not in (None, "")
        amt = float(t["amount"])
        assert amt > 0


def test_06_baseline_calculation():
    txs, custs = _files()
    baselines = load_customer_baselines()
    assert len(baselines) == len(custs)
    for cid, b in baselines.items():
        for key in ["total_transactions", "total_amount", "average_amount",
                    "median_amount", "minimum_amount", "maximum_amount",
                    "standard_deviation", "typical_transaction_count_per_day",
                    "average_daily_amount", "most_common_payees",
                    "most_common_channels", "most_common_transaction_types",
                    "typical_transaction_hour", "median_transaction_hour",
                    "weekday_transaction_count", "weekend_transaction_count",
                    "monthly_transaction_count", "monthly_total_amount"]:
            assert key in b, f"{cid} missing {key}"
        assert b["total_transactions"] > 200


def test_07_payee_baseline_calculation():
    payee = load_payee_baselines()
    assert len(payee) == 20
    for cid, per_payee in payee.items():
        assert len(per_payee) >= 5, f"{cid} has too few payees"
        for name, stats in per_payee.items():
            assert stats["transactions"] > 0
            assert stats["average_amount"] > 0
            assert stats["first_seen"] <= stats["last_seen"]


def test_08_channel_baseline_calculation():
    baselines = load_customer_baselines()
    for cid, b in baselines.items():
        cb = b.get("channel_baseline", {})
        assert cb, f"{cid} missing channel_baseline"
        total_pct = sum(v["percentage"] for v in cb.values())
        assert 99.0 <= total_pct <= 101.0
    # Baselines differ between customers (behavioural variation).
    primaries = [max(v["most_common_channels"], key=lambda x: x[1])[0]
                 if v["most_common_channels"] else None for v in baselines.values()]
    assert len(set(primaries)) > 1


def test_09_time_baseline_calculation():
    baselines = load_customer_baselines()
    for cid, b in baselines.items():
        td = b.get("time_distribution", {})
        assert set(td) == {"06:00-10:00", "10:00-14:00", "14:00-18:00",
                           "18:00-22:00", "22:00-06:00"}
        assert 0 <= b["typical_transaction_hour"] <= 23
        assert 0 <= b["median_transaction_hour"] <= 23


def test_10_deterministic_generation():
    c1, t1, _, _ = generate_dataset(seed=SEED)
    c2, t2, _, _ = generate_dataset(seed=SEED)
    assert c1 == c2
    assert t1 == t2
    # Validation passes on generated data.
    result = validate_dataset(t1, c1)
    assert result["valid"], result["errors"][:5]
    assert result["rows"] == len(t1)
    # Spot-check baseline determinism.
    b1 = calculate_customer_baseline([x for x in t1 if x["customer_id"] == "C001"])
    b2 = calculate_customer_baseline([x for x in t2 if x["customer_id"] == "C001"])
    assert b1 == b2
    all_b = calculate_all_baselines(t1)
    pay_b = calculate_payee_baselines(t1)
    assert "C001" in all_b and "C001" in pay_b
