"""Phase 1 — clean data-access layer for future phases."""

import csv
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"


def _read_csv(name: str) -> list:
    path = DATA_DIR / name
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    # Coerce numeric fields for convenience (CSV stores strings).
    if name == "transactions.csv":
        for r in rows:
            try:
                r["amount"] = float(r["amount"])
            except (TypeError, ValueError):
                pass
    if name == "customers.csv":
        for r in rows:
            try:
                r["typical_monthly_transactions"] = int(r["typical_monthly_transactions"])
                r["typical_monthly_amount"] = float(r["typical_monthly_amount"])
            except (TypeError, ValueError):
                pass
    return rows


def _read_json(name: str) -> dict:
    path = DATA_DIR / name
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_transactions() -> list:
    return _read_csv("transactions.csv")


def load_customers() -> list:
    return _read_csv("customers.csv")


def load_customer_baselines() -> dict:
    return _read_json("customer_baselines.json")


def load_payee_baselines() -> dict:
    return _read_json("payee_baselines.json")


def load_metadata() -> dict:
    return _read_json("dataset_metadata.json")


def load_findings() -> dict:
    doc = _read_json("findings.json")
    if not doc:
        return {"generated_from": "data/transactions.csv", "engine_version": "1.0",
                "rules": ["R01", "R02", "R03", "R04", "R05"],
                "transactions_analysed": 0, "findings": []}
    return doc


def load_evidence() -> dict:
    doc = _read_json("evidence.json")
    if not doc:
        return {"engine_version": "1.0", "generated_from": "data/findings.json",
                "evidence_packages": []}
    return doc


def load_investigations() -> dict:
    doc = _read_json("investigation_context.json")
    if not doc:
        return {"engine_version": "1.0", "generated_from": "data/evidence.json",
                "investigations": []}
    return doc


def get_customer_transactions(customer_id: str) -> list:
    return [t for t in load_transactions() if t.get("customer_id") == customer_id]


def get_customer_baseline(customer_id: str) -> dict:
    return load_customer_baselines().get(customer_id, {})
