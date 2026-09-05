"""Phase 1 — deterministic synthetic transaction dataset generator.

Normal customer activity ONLY. No fraud injection, no risk rules,
no Gemini, no embeddings. SEED=42 guarantees reproducibility.
"""

import calendar
import random
from datetime import date, datetime
from pathlib import Path

SEED = 42
DATASET_VERSION = "1.0"
DATE_START = date(2026, 3, 1)
DATE_END = date(2026, 8, 31)
MONTHS = [(2026, 3), (2026, 4), (2026, 5), (2026, 6), (2026, 7), (2026, 8)]

CHANNELS = ["UPI", "CARD", "BANK_TRANSFER", "NET_BANKING", "ATM", "CASH"]
TRANSACTION_TYPES = [
    "PURCHASE", "BILL_PAYMENT", "TRANSFER", "SALARY", "RENT",
    "WITHDRAWAL", "SUBSCRIPTION", "REFUND", "UTILITY", "FUEL",
    "GROCERY", "DINING", "TRAVEL",
]

# (payees, descriptions, amount_min, amount_max) per transaction type.
TYPE_CONFIG = {
    "PURCHASE": (["Amazon", "Flipkart"], ["Online shopping", "Online purchase"], 300, 15000),
    "GROCERY": (["Grocery Store", "FreshMart"], ["Grocery shopping", "Weekly groceries", "Supermarket purchase"], 200, 5000),
    "DINING": (["Swiggy", "Zomato"], ["Food delivery", "Restaurant payment", "Food order"], 150, 3000),
    "TRAVEL": (["Uber", "Ola"], ["Cab ride", "Travel booking", "Taxi fare"], 200, 8000),
    "SUBSCRIPTION": (["Netflix", "Spotify"], ["Monthly subscription", "Streaming subscription"], 149, 999),
    "UTILITY": (
        ["Electricity Board", "Mobile Provider", "Internet Provider", "Utility Payment"],
        ["Electricity bill", "Mobile recharge", "Internet bill", "Utility payment"],
        500, 8000,
    ),
    "BILL_PAYMENT": (
        ["Electricity Board", "Insurance", "Mobile Provider", "Education"],
        ["Bill payment", "Insurance premium", "Education fee"],
        1000, 15000,
    ),
    "FUEL": (["Fuel Station"], ["Fuel station payment"], 500, 5000),
    "TRANSFER": (["Bank Transfer"], ["Bank transfer", "Fund transfer"], 1000, 30000),
    "WITHDRAWAL": (["ATM"], ["ATM cash withdrawal"], 2000, 20000),
    "REFUND": (["Amazon", "Flipkart"], ["Refund - returned item"], 200, 5000),
}

# Hour weights 0-23: mostly daytime/evening, rare night. Descriptive baseline only.
HOUR_WEIGHTS = [
    0.2, 0.1, 0.1, 0.1, 0.2, 0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 5.0,
    5.0, 4.5, 4.0, 4.0, 4.0, 4.5, 5.0, 5.5, 5.0, 4.0, 2.5, 1.0,
]

BASE_TYPE_WEIGHTS = {
    "PURCHASE": 14, "GROCERY": 14, "DINING": 13, "TRAVEL": 8, "FUEL": 7,
    "TRANSFER": 8, "WITHDRAWAL": 5, "UTILITY": 6, "BILL_PAYMENT": 6,
    "SUBSCRIPTION": 3, "REFUND": 2,
}

ARCHETYPES = [
    {"key": "upi_heavy", "channel_dist": {"UPI": 65, "CARD": 25, "BANK_TRANSFER": 10}},
    {"key": "salary_driven", "channel_dist": {"UPI": 40, "CARD": 20, "BANK_TRANSFER": 30, "NET_BANKING": 10}},
    {"key": "card_shopper", "channel_dist": {"CARD": 60, "UPI": 20, "BANK_TRANSFER": 20}},
    {"key": "low_freq", "channel_dist": {"BANK_TRANSFER": 40, "CARD": 30, "UPI": 20, "ATM": 10}},
    {"key": "mixed", "channel_dist": {"UPI": 35, "CARD": 35, "BANK_TRANSFER": 20, "NET_BANKING": 10}},
]

CUSTOMER_NAMES = [
    ("Aarav Mehta", "professional"), ("Diya Sharma", "salaried"),
    ("Kabir Singh", "business_owner"), ("Ananya Iyer", "professional"),
    ("Vikram Rao", "salaried"), ("Priya Nair", "freelancer"),
    ("Arjun Patel", "business_owner"), ("Sneha Kulkarni", "professional"),
    ("Rohan Gupta", "salaried"), ("Ishita Verma", "student"),
    ("Aditya Joshi", "professional"), ("Kavya Reddy", "freelancer"),
    ("Nikhil Menon", "salaried"), ("Pooja Desai", "business_owner"),
    ("Suresh Kumar", "retiree"), ("Meera Pillai", "professional"),
    ("Rahul Chopra", "salaried"), ("Tanvi Bose", "student"),
    ("Karan Malhotra", "business_owner"), ("Divya Krishnan", "professional"),
]


def _weighted_hour(rng: random.Random) -> int:
    return rng.choices(list(range(24)), weights=HOUR_WEIGHTS, k=1)[0]


def _pick_channel(rng: random.Random, channel_dist: dict) -> str:
    channels = list(channel_dist.keys())
    weights = list(channel_dist.values())
    ch = rng.choices(channels, weights=weights, k=1)[0]
    # WITHDRAWAL must be ATM, but channel choice happens per-transaction below;
    # caller overrides where semantically required.
    return ch


def build_customer_profiles(rng: random.Random) -> list:
    profiles = []
    for i, (name, ctype) in enumerate(CUSTOMER_NAMES):
        cid = f"C{i+1:03d}"
        arch = ARCHETYPES[i % len(ARCHETYPES)]
        # Monthly volume varies by archetype to create real baseline differences.
        if arch["key"] == "low_freq":
            monthly_tx = rng.randint(52, 64)
        elif arch["key"] == "upi_heavy":
            monthly_tx = rng.randint(80, 95)
        else:
            monthly_tx = rng.randint(68, 88)
        if ctype == "student":
            salary = round(rng.uniform(15000, 28000), 2)
            rent = round(rng.uniform(6000, 12000), 2)
        elif ctype == "retiree":
            salary = round(rng.uniform(25000, 45000), 2)
            rent = round(rng.uniform(8000, 15000), 2)
        elif ctype == "business_owner":
            salary = round(rng.uniform(80000, 150000), 2)
            rent = round(rng.uniform(18000, 35000), 2)
        else:
            salary = round(rng.uniform(40000, 110000), 2)
            rent = round(rng.uniform(9000, 28000), 2)
        typical_monthly_amount = round(salary * rng.uniform(0.85, 1.15), 2)
        primary = max(arch["channel_dist"], key=lambda k: arch["channel_dist"][k])
        profiles.append({
            "customer_id": cid,
            "customer_name": name,
            "customer_type": ctype,
            "primary_channel": primary,
            "channel_dist": dict(arch["channel_dist"]),
            "archetype": arch["key"],
            "typical_monthly_transactions": monthly_tx,
            "typical_monthly_amount": typical_monthly_amount,
            "salary_amount": salary,
            "rent_amount": rent,
        })
    return profiles


def _jitter(rng: random.Random, value: float, pct: float) -> float:
    return round(value * rng.uniform(1 - pct, 1 + pct), 2)


def generate_dataset(seed: int = SEED) -> tuple:
    """Generate (customers, transactions, metadata). Fully deterministic."""
    rng = random.Random(seed)
    profiles = build_customer_profiles(rng)

    raw: list = []
    for cust in profiles:
        cid = cust["customer_id"]
        for (year, month) in MONTHS:
            days_in_month = calendar.monthrange(year, month)[1]

            # --- Recurring monthly behaviour ---
            # Salary: day 1, morning, bank transfer.
            sal_amt = _jitter(rng, cust["salary_amount"], 0.03)
            raw.append(_make_tx(rng, cid, year, month, 1,
                                hour=rng.randint(9, 11), minute=rng.randint(0, 59),
                                payee="Employer", desc="Monthly salary credit",
                                amount=sal_amt, channel="BANK_TRANSFER", ttype="SALARY"))
            # Rent: day 2-4.
            rent_day = rng.randint(2, 4)
            raw.append(_make_tx(rng, cid, year, month, rent_day,
                                hour=rng.randint(10, 14), minute=rng.randint(0, 59),
                                payee="Rent", desc="Monthly apartment rent",
                                amount=_jitter(rng, cust["rent_amount"], 0.02),
                                channel=rng.choice(["BANK_TRANSFER", "NET_BANKING"]),
                                ttype="RENT"))
            # Subscriptions: Netflix always; Spotify for most.
            raw.append(_make_tx(rng, cid, year, month, rng.randint(5, 12),
                                hour=rng.randint(10, 20), minute=rng.randint(0, 59),
                                payee="Netflix", desc="Monthly subscription",
                                amount=649.00, channel=_pick_channel(rng, cust["channel_dist"]),
                                ttype="SUBSCRIPTION"))
            if rng.random() < 0.75:
                raw.append(_make_tx(rng, cid, year, month, rng.randint(5, 15),
                                    hour=rng.randint(10, 20), minute=rng.randint(0, 59),
                                    payee="Spotify", desc="Streaming subscription",
                                    amount=299.00, channel=_pick_channel(rng, cust["channel_dist"]),
                                    ttype="SUBSCRIPTION"))
            # Utilities: electricity + mobile.
            raw.append(_make_tx(rng, cid, year, month, rng.randint(10, 18),
                                hour=rng.randint(9, 19), minute=rng.randint(0, 59),
                                payee="Electricity Board", desc="Electricity bill",
                                amount=round(rng.uniform(800, 6000), 2),
                                channel=_pick_channel(rng, cust["channel_dist"]),
                                ttype="UTILITY"))
            raw.append(_make_tx(rng, cid, year, month, rng.randint(8, 20),
                                hour=rng.randint(9, 19), minute=rng.randint(0, 59),
                                payee="Mobile Provider", desc="Mobile recharge",
                                amount=round(rng.uniform(299, 999), 2),
                                channel=_pick_channel(rng, cust["channel_dist"]),
                                ttype="UTILITY"))

            recurring = 6  # salary, rent, netflix, (+spotify ~0.75), electricity, mobile
            # Approximate: use fixed 6 and let jitter absorb the spotify variance.
            target = cust["typical_monthly_transactions"] + rng.randint(-3, 3)
            n_random = max(target - recurring, 20)
            for _ in range(n_random):
                day = rng.randint(1, days_in_month)
                d = date(year, month, day)
                is_weekend = d.weekday() >= 5
                ttype = _pick_type(rng, is_weekend)
                payees, descs, lo, hi = TYPE_CONFIG[ttype]
                payee = rng.choice(payees)
                desc = rng.choice(descs)
                amount = round(rng.uniform(lo, hi), 2)
                hour = _weighted_hour(rng)
                minute = rng.randint(0, 59)
                if ttype == "WITHDRAWAL":
                    channel = "ATM"
                elif ttype == "TRANSFER" and rng.random() < 0.6:
                    channel = rng.choice(["BANK_TRANSFER", "NET_BANKING", "UPI"])
                else:
                    channel = _pick_channel(rng, cust["channel_dist"])
                    if channel == "ATM" and ttype != "WITHDRAWAL":
                        channel = "CARD"  # keep ATM semantically for withdrawals
                raw.append(_make_tx(rng, cid, year, month, day, hour=hour,
                                    minute=minute, payee=payee, desc=desc,
                                    amount=amount, channel=channel, ttype=ttype))

    # Sort globally for chronological consistency, then assign stable IDs.
    raw.sort(key=lambda r: (r["timestamp"], r["customer_id"]))
    transactions = []
    for idx, r in enumerate(raw, start=1):
        r["transaction_id"] = f"TX{idx:06d}"
        transactions.append(r)

    # Public customer rows (no internal salary/rent/channel_dist leakage beyond spec columns).
    customers = [{
        "customer_id": c["customer_id"],
        "customer_name": c["customer_name"],
        "customer_type": c["customer_type"],
        "primary_channel": c["primary_channel"],
        "typical_monthly_transactions": c["typical_monthly_transactions"],
        "typical_monthly_amount": c["typical_monthly_amount"],
    } for c in profiles]

    metadata = {
        "dataset_version": DATASET_VERSION,
        "random_seed": seed,
        "customers": len(customers),
        "transactions": len(transactions),
        "date_start": DATE_START.isoformat(),
        "date_end": DATE_END.isoformat(),
        "channels": CHANNELS,
        "transaction_types": TRANSACTION_TYPES,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }
    return customers, transactions, metadata, profiles


def _make_tx(rng: random.Random, customer_id: str, year: int, month: int, day: int,
             hour: int, minute: int, payee: str, desc: str,
             amount: float, channel: str, ttype: str) -> dict:
    days_in_month = calendar.monthrange(year, month)[1]
    day = max(1, min(day, days_in_month))
    ts = datetime(year, month, day, hour % 24, minute % 60, 0)
    return {
        "transaction_id": "",  # assigned after global sort
        "customer_id": customer_id,
        "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%S"),
        "date": ts.strftime("%Y-%m-%d"),
        "time": ts.strftime("%H:%M:%S"),
        "description": desc,
        "payee": payee,
        "amount": round(float(amount), 2),
        "channel": channel,
        "transaction_type": ttype,
    }


def _pick_type(rng: random.Random, is_weekend: bool) -> str:
    weights = dict(BASE_TYPE_WEIGHTS)
    if is_weekend:
        weights["DINING"] += 5
        weights["PURCHASE"] += 4
        weights["TRAVEL"] += 3
        weights["GROCERY"] += 2
        weights["UTILITY"] = max(weights["UTILITY"] - 3, 1)
        weights["BILL_PAYMENT"] = max(weights["BILL_PAYMENT"] - 3, 1)
    keys = list(weights.keys())
    return rng.choices(keys, weights=[weights[k] for k in keys], k=1)[0]


def save_dataset(customers: list, transactions: list, metadata: dict,
                 baselines: dict, payee_baselines: dict,
                 data_dir: Path) -> None:
    import csv
    import json

    data_dir.mkdir(parents=True, exist_ok=True)

    with open(data_dir / "transactions.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "transaction_id", "customer_id", "timestamp", "date", "time",
            "description", "payee", "amount", "channel", "transaction_type",
        ])
        writer.writeheader()
        writer.writerows(transactions)

    with open(data_dir / "customers.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "customer_id", "customer_name", "customer_type", "primary_channel",
            "typical_monthly_transactions", "typical_monthly_amount",
        ])
        writer.writeheader()
        writer.writerows(customers)

    with open(data_dir / "customer_baselines.json", "w", encoding="utf-8") as f:
        json.dump(baselines, f, indent=2)

    with open(data_dir / "payee_baselines.json", "w", encoding="utf-8") as f:
        json.dump(payee_baselines, f, indent=2)

    with open(data_dir / "dataset_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
