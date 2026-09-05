"""Phase 2 — finding validation (reports problems, never fixes silently)."""

VALID_RULES = {"R01", "R02", "R03", "R04", "R05"}
VALID_SEVERITIES = {"LOW", "MEDIUM", "HIGH"}


def validate_findings(findings: list, transactions: list, customers: list) -> dict:
    errors: list = []
    warnings: list = []
    tx_ids = {t.get("transaction_id") for t in transactions}
    customer_ids = {c.get("customer_id") for c in customers}

    seen: set = set()
    for i, f in enumerate(findings):
        fid = f.get("finding_id", f"index-{i}")
        # finding_id unique.
        if f.get("finding_id") in seen:
            errors.append(f"Duplicate finding_id '{fid}'.")
        seen.add(f.get("finding_id"))
        # customer / rule / severity.
        if f.get("customer_id") not in customer_ids:
            errors.append(f"{fid}: unknown customer_id '{f.get('customer_id')}'.")
        if f.get("rule_id") not in VALID_RULES:
            errors.append(f"{fid}: invalid rule_id '{f.get('rule_id')}'.")
        if f.get("severity") not in VALID_SEVERITIES:
            errors.append(f"{fid}: invalid severity '{f.get('severity')}'.")
        # Structural blocks.
        for key in ["evidence", "baseline", "calculation", "traceability"]:
            if not isinstance(f.get(key), dict) or not f.get(key):
                errors.append(f"{fid}: missing/empty '{key}'.")
        # Traceability: IDs exist and match source.
        tids = f.get("transaction_ids") or []
        if not tids:
            errors.append(f"{fid}: empty transaction_ids.")
        for tid in tids:
            if tid not in tx_ids:
                errors.append(f"{fid}: fictional transaction_id '{tid}'.")
        trace = (f.get("traceability") or {}).get("transaction_ids", [])
        if set(trace) != set(tids):
            errors.append(f"{fid}: traceability IDs do not match transaction_ids.")
        if (f.get("traceability") or {}).get("source") != "data/transactions.csv":
            warnings.append(f"{fid}: unexpected traceability source.")
        # No fraud language (auditable wording check).
        summary = str(f.get("summary", "")).lower()
        for banned in ["fraud confirmed", "criminal activity", "money laundering",
                       "customer is fraudulent", "fraud detected"]:
            if banned in summary:
                errors.append(f"{fid}: prohibited wording '{banned}' in summary.")

    return {"valid": len(errors) == 0, "errors": errors[:50],
            "warnings": warnings[:50], "findings": len(findings)}
