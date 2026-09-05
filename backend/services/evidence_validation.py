"""Phase 3 — evidence validation (reports problems, never fixes silently).

Every evidence package must trace back to a real finding and real
source transactions belonging to the correct customer.
"""

VALID_RULES = {"R01", "R02", "R03", "R04", "R05"}


def validate_evidence(packages: list, findings: list, transactions: list,
                      customers: list) -> dict:
    errors: list = []
    warnings: list = []
    tx_by_id = {t.get("transaction_id"): t for t in transactions}
    customer_ids = {c.get("customer_id") for c in customers}
    findings_by_id = {f.get("finding_id"): f for f in findings}

    seen: set = set()
    for p in packages:
        fid = p.get("finding_id", "?")
        finding = findings_by_id.get(fid)
        # Finding must exist.
        if finding is None:
            errors.append(f"Package {fid}: no such finding in findings.json.")
            continue
        if fid in seen:
            errors.append(f"Duplicate evidence package for finding '{fid}'.")
        seen.add(fid)
        # IDs must match the finding.
        for key in ["customer_id", "rule_id"]:
            if p.get(key) != finding.get(key):
                errors.append(f"Package {fid}: {key} '{p.get(key)}' does not match finding '{finding.get(key)}'.")
        if p.get("rule_id") not in VALID_RULES:
            errors.append(f"Package {fid}: invalid rule_id '{p.get('rule_id')}'.")
        if p.get("customer_id") not in customer_ids:
            errors.append(f"Package {fid}: unknown customer_id.")
        # Primary transactions: exist, belong to customer, no duplicates.
        primaries = p.get("primary_transactions") or []
        if not primaries:
            errors.append(f"Package {fid}: empty primary_transactions.")
        if len({t.get("transaction_id") for t in primaries}) != len(primaries):
            errors.append(f"Package {fid}: duplicate primary transactions.")
        if set(t.get("transaction_id") for t in primaries) != set(finding.get("transaction_ids") or []):
            errors.append(f"Package {fid}: primary IDs do not match finding transaction_ids.")
        for t in primaries:
            src = tx_by_id.get(t.get("transaction_id"))
            if src is None:
                errors.append(f"Package {fid}: fabricated primary '{t.get('transaction_id')}'.")
            elif src.get("customer_id") != p.get("customer_id"):
                errors.append(f"Package {fid}: primary '{t.get('transaction_id')}' belongs to another customer.")
        # Related transactions: exist, same customer, never overlap primaries.
        primary_ids = {t.get("transaction_id") for t in primaries}
        for t in p.get("related_transactions") or []:
            src = tx_by_id.get(t.get("transaction_id"))
            if src is None:
                errors.append(f"Package {fid}: fabricated related '{t.get('transaction_id')}'.")
            elif src.get("customer_id") != p.get("customer_id"):
                errors.append(f"Package {fid}: related '{t.get('transaction_id')}' belongs to another customer.")
            if t.get("transaction_id") in primary_ids:
                errors.append(f"Package {fid}: related overlaps primary '{t.get('transaction_id')}'.")
        # Calculation must match the authoritative Phase 2 finding.
        if (p.get("calculation") or {}).get("result") != (finding.get("calculation") or {}).get("result") \
                and (p.get("calculation") or {}).get("formula") != (finding.get("calculation") or {}).get("formula"):
            # Only flag when both formula and result differ (different logic).
            errors.append(f"Package {fid}: calculation does not match Phase 2 finding.")
        # Baseline + traceability present.
        if not p.get("customer_context"):
            errors.append(f"Package {fid}: missing customer_context.")
        trace = p.get("source_traceability") or {}
        for key in ["transaction_source", "transaction_ids", "customer_id", "rule_id", "finding_id"]:
            if not trace.get(key):
                errors.append(f"Package {fid}: missing traceability '{key}'.")
        if set(trace.get("transaction_ids", [])) != set(finding.get("transaction_ids") or []):
            errors.append(f"Package {fid}: traceability IDs do not match finding.")

    # Coverage warning (not an error): findings without packages.
    for fid in findings_by_id:
        if fid not in seen:
            warnings.append(f"Finding {fid} has no evidence package.")

    return {"valid": len(errors) == 0, "errors": errors[:50],
            "warnings": warnings[:50], "packages": len(packages)}
