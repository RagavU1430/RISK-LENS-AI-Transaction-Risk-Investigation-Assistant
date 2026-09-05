"""Phase 1 — dataset validation. Reports problems, never silently fixes."""

from datetime import datetime

REQUIRED_COLUMNS = [
    "transaction_id", "customer_id", "timestamp", "date", "time",
    "description", "payee", "amount", "channel", "transaction_type",
]

VALID_CHANNELS = {"UPI", "CARD", "BANK_TRANSFER", "NET_BANKING", "ATM", "CASH"}
VALID_TYPES = {
    "PURCHASE", "BILL_PAYMENT", "TRANSFER", "SALARY", "RENT",
    "WITHDRAWAL", "SUBSCRIPTION", "REFUND", "UTILITY", "FUEL",
    "GROCERY", "DINING", "TRAVEL",
}


def validate_dataset(transactions: list, customers: list) -> dict:
    errors: list = []
    warnings: list = []
    customer_ids = {c["customer_id"] for c in customers}

    if not transactions:
        errors.append("No transactions found.")
        return {"valid": False, "errors": errors, "warnings": warnings, "rows": 0}

    seen_ids: set = set()
    for i, t in enumerate(transactions):
        # Required columns / nulls.
        for col in REQUIRED_COLUMNS:
            if col not in t or t[col] is None or (isinstance(t[col], str) and t[col].strip() == ""):
                errors.append(f"Row {i}: missing required value for '{col}'.")
        # Uniqueness.
        tid = t.get("transaction_id")
        if tid in seen_ids:
            errors.append(f"Duplicate transaction_id '{tid}'.")
        seen_ids.add(tid)
        # Customer reference.
        if t.get("customer_id") not in customer_ids:
            errors.append(f"Row {i}: orphan customer_id '{t.get('customer_id')}'.")
        # Timestamp.
        try:
            ts = datetime.fromisoformat(str(t.get("timestamp")))
            d = datetime.strptime(str(t.get("date")), "%Y-%m-%d").date()
            datetime.strptime(str(t.get("time")), "%H:%M:%S")
            if ts.date() != d:
                warnings.append(f"Row {i}: timestamp/date mismatch '{tid}'.")
        except (ValueError, TypeError):
            errors.append(f"Row {i}: invalid timestamp/date/time '{tid}'.")
        # Amount numeric and positive.
        try:
            amt = float(t.get("amount"))
            if amt <= 0:
                errors.append(f"Row {i}: non-positive amount '{tid}'.")
        except (TypeError, ValueError):
            errors.append(f"Row {i}: non-numeric amount '{tid}'.")
        # Channels / types.
        if t.get("channel") not in VALID_CHANNELS:
            errors.append(f"Row {i}: invalid channel '{t.get('channel')}'.")
        if t.get("transaction_type") not in VALID_TYPES:
            errors.append(f"Row {i}: invalid transaction_type '{t.get('transaction_type')}'.")

    # Chronological consistency: IDs should be chronological after generation sort.
    # Light check: timestamps parse and span multiple months.
    try:
        stamps = sorted(datetime.fromisoformat(t["timestamp"]) for t in transactions)
        span_days = (stamps[-1] - stamps[0]).days
        if span_days < 150:
            warnings.append(f"Dataset spans only {span_days} days; expected ~180 (6 months).")
    except ValueError:
        pass

    # Coverage checks.
    from collections import Counter
    per_customer = Counter(t.get("customer_id") for t in transactions)
    for cid, n in per_customer.items():
        if n < 200:
            warnings.append(f"Customer {cid} has only {n} transactions (<200).")
    if len(per_customer) < 2:
        warnings.append("Only one customer present.")

    return {"valid": len(errors) == 0, "errors": errors[:50],
            "warnings": warnings[:50], "rows": len(transactions)}
