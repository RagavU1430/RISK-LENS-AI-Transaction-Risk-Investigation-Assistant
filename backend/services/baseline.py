"""Phase 1 — descriptive customer behavioural baselines.

Statistics only. No risk scoring, no anomaly classification,
no fraud prediction. Future Phase 2 will consume these baselines.
"""

import statistics
from collections import Counter, defaultdict
from datetime import datetime


def _parse_hour(ts: str) -> int:
    try:
        return datetime.fromisoformat(ts).hour
    except ValueError:
        return 12


def _time_bucket(hour: int) -> str:
    if 6 <= hour < 10:
        return "06:00-10:00"
    if 10 <= hour < 14:
        return "10:00-14:00"
    if 14 <= hour < 18:
        return "14:00-18:00"
    if 18 <= hour < 22:
        return "18:00-22:00"
    return "22:00-06:00"


def calculate_customer_baseline(transactions: list) -> dict:
    """Descriptive stats for ONE customer's transaction list."""
    if not transactions:
        return {
            "total_transactions": 0, "total_amount": 0.0, "average_amount": 0.0,
            "median_amount": 0.0, "minimum_amount": 0.0, "maximum_amount": 0.0,
            "standard_deviation": 0.0,
        }
    amounts = [float(t["amount"]) for t in transactions]
    amounts_sorted = sorted(amounts)
    total = len(amounts)
    total_amt = round(sum(amounts), 2)
    avg = round(total_amt / total, 2)
    median = round(statistics.median(amounts_sorted), 2)
    stdev = round(statistics.pstdev(amounts_sorted), 2) if total > 1 else 0.0

    # Daily aggregation.
    by_day: dict = defaultdict(list)
    for t in transactions:
        by_day[t["date"]].append(float(t["amount"]))
    n_days = len(by_day)
    per_day_counts = sorted(len(v) for v in by_day.values())
    daily_totals = sorted(sum(v) for v in by_day.values())
    avg_per_day = round(total / n_days, 3) if n_days else 0.0
    avg_daily_amt = round(total_amt / n_days, 2) if n_days else 0.0

    # Categorical distributions.
    payee_counts = Counter(t["payee"] for t in transactions)
    channel_counts = Counter(t["channel"] for t in transactions)
    type_counts = Counter(t["transaction_type"] for t in transactions)

    hours = sorted(_parse_hour(t["timestamp"]) for t in transactions)
    median_hour = int(statistics.median(hours))
    typical_hour = Counter(hours).most_common(1)[0][0]

    # Time buckets (%).
    buckets = Counter(_time_bucket(h) for h in hours)
    time_distribution = {b: round(buckets.get(b, 0) / total * 100, 2) for b in
                         ["06:00-10:00", "10:00-14:00", "14:00-18:00", "18:00-22:00", "22:00-06:00"]}

    # Weekday vs weekend.
    weekday_ct = weekend_ct = 0
    for t in transactions:
        try:
            wd = datetime.fromisoformat(t["timestamp"]).weekday()
            if wd >= 5:
                weekend_ct += 1
            else:
                weekday_ct += 1
        except ValueError:
            weekday_ct += 1

    # Monthly summaries.
    monthly_count: dict = Counter()
    monthly_total: dict = defaultdict(float)
    for t in transactions:
        m = t["date"][:7]
        monthly_count[m] += 1
        monthly_total[m] += float(t["amount"])
    monthly_count = dict(sorted(monthly_count.items()))
    monthly_total = {k: round(v, 2) for k, v in sorted(monthly_total.items())}

    channel_total = defaultdict(float)
    for t in transactions:
        channel_total[t["channel"]] += float(t["amount"])
    channel_baseline = {
        ch: {"count": channel_counts[ch],
             "percentage": round(channel_counts[ch] / total * 100, 2),
             "total_amount": round(channel_total[ch], 2)}
        for ch in channel_counts
    }

    return {
        "total_transactions": total,
        "total_amount": total_amt,
        "average_amount": avg,
        "median_amount": median,
        "minimum_amount": round(min(amounts_sorted), 2),
        "maximum_amount": round(max(amounts_sorted), 2),
        "standard_deviation": stdev,
        "typical_transaction_count_per_day": avg_per_day,
        "average_daily_amount": avg_daily_amt,
        "median_transactions_per_day": float(statistics.median(per_day_counts)) if per_day_counts else 0.0,
        "max_transactions_per_day": max(per_day_counts) if per_day_counts else 0,
        "min_transactions_per_day": min(per_day_counts) if per_day_counts else 0,
        "median_daily_spend": round(statistics.median(daily_totals), 2) if daily_totals else 0.0,
        "most_common_payees": payee_counts.most_common(10),
        "most_common_channels": channel_counts.most_common(),
        "most_common_transaction_types": type_counts.most_common(),
        "channel_baseline": channel_baseline,
        "typical_transaction_hour": typical_hour,
        "median_transaction_hour": median_hour,
        "time_distribution": time_distribution,
        "weekday_transaction_count": weekday_ct,
        "weekend_transaction_count": weekend_ct,
        "monthly_transaction_count": monthly_count,
        "monthly_total_amount": monthly_total,
        "active_days": n_days,
    }


def calculate_all_baselines(transactions: list) -> dict:
    grouped: dict = defaultdict(list)
    for t in transactions:
        grouped[t["customer_id"]].append(t)
    return {cid: calculate_customer_baseline(txs) for cid, txs in sorted(grouped.items())}


def calculate_payee_baselines(transactions: list) -> dict:
    """Per-customer per-payee history: counts, totals, first/last seen."""
    grouped: dict = defaultdict(lambda: defaultdict(list))
    for t in transactions:
        grouped[t["customer_id"]][t["payee"]].append(t)
    out: dict = {}
    for cid in sorted(grouped):
        out[cid] = {}
        for payee in sorted(grouped[cid]):
            txs = sorted(grouped[cid][payee], key=lambda x: x["timestamp"])
            amounts = [float(x["amount"]) for x in txs]
            out[cid][payee] = {
                "transactions": len(txs),
                "total_amount": round(sum(amounts), 2),
                "average_amount": round(sum(amounts) / len(amounts), 2) if amounts else 0.0,
                "first_seen": txs[0]["timestamp"],
                "last_seen": txs[-1]["timestamp"],
            }
    return out
