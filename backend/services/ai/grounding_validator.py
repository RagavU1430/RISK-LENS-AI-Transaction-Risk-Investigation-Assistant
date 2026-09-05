"""Phase 4 — grounding validator for AI explanations.

Every transaction/finding/rule ID referenced by Gemini must already exist
in the supplied InvestigationContext. Fabricated references (e.g. TX-FAKE)
or forbidden fraud verdicts cause status "grounding_failed" — never silent
acceptance.
"""

import re

BANNED_PHRASES = [
    "committed fraud",
    "are fraudulent",
    "is fraudulent",
    "definitely fraud",
    "definitely is fraud",
    "account is compromised",
    "account has been compromised",
    "money laundering",
    "criminal activity",
]

_TX_RE = re.compile(r"TX\d+")
_RULE_RE = re.compile(r"R0[1-5]")
_FINDING_RE = re.compile(r"(?<![A-Z0-9])F\d{3,}(?![0-9])")
_VALID_SOURCE_TYPES = {"transaction", "finding", "baseline", "evidence"}


def _strings_in(obj):
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for value in obj.values():
            yield from _strings_in(value)
    elif isinstance(obj, (list, tuple)):
        for value in obj:
            yield from _strings_in(value)


def _allowed_ids(context: dict):
    allowed_tx, allowed_rules, allowed_findings = set(), set(), set()
    for f in context.get("findings", []):
        if f.get("finding_id"):
            allowed_findings.add(str(f["finding_id"]))
        if f.get("rule_id"):
            allowed_rules.add(str(f["rule_id"]))
        for tid in f.get("transaction_ids") or []:
            allowed_tx.add(str(tid))
    for p in context.get("evidence_packages", []):
        for t in (p.get("primary_transactions") or []) + (p.get("related_transactions") or []):
            if t.get("transaction_id"):
                allowed_tx.add(str(t["transaction_id"]))
    return allowed_tx, allowed_rules, allowed_findings


def validate_grounding(report: dict, context: dict) -> dict:
    """Validate an AI report dict against its investigation context."""
    errors: list = []
    allowed_tx, allowed_rules, allowed_findings = _allowed_ids(context or {})

    text_fields = {k: v for k, v in (report or {}).items()
                   if k not in ("source_references",)}
    referenced_tx = set()
    for s in _strings_in(text_fields):
        referenced_tx.update(_TX_RE.findall(s))
    for ref in (report or {}).get("source_references", []) or []:
        for tid in (ref.get("transaction_ids") or []):
            referenced_tx.add(str(tid))
        sid = str(ref.get("source_id", ""))
        if ref.get("source_type") == "transaction" and _TX_RE.fullmatch(sid):
            referenced_tx.add(sid)
    for tid in sorted(referenced_tx):
        if tid not in allowed_tx:
            errors.append(f"Unsupported transaction ID '{tid}' not present in investigation context.")

    for rule_id in sorted(set(_RULE_RE.findall(" ".join(
            s for s in _strings_in(text_fields) if isinstance(s, str))))):
        if rule_id not in allowed_rules:
            errors.append(f"Unsupported rule ID '{rule_id}' not present in investigation context.")
    for rule_exp in (report or {}).get("rule_explanations", []) or []:
        rid = str(rule_exp.get("rule_id", ""))
        if rid and rid not in allowed_rules:
            errors.append(f"Rule explanation references unknown rule '{rid}'.")
    for fid in sorted(set(_FINDING_RE.findall(" ".join(
            s for s in _strings_in(text_fields) if isinstance(s, str))))):
        if fid not in allowed_findings:
            errors.append(f"Unsupported finding ID '{fid}' not present in investigation context.")
    for ref in (report or {}).get("source_references", []) or []:
        stype = ref.get("source_type")
        sid = str(ref.get("source_id", ""))
        if stype not in _VALID_SOURCE_TYPES:
            errors.append(f"Unsupported source reference type '{stype}'.")
        elif stype == "transaction" and _TX_RE.fullmatch(sid) and sid not in allowed_tx:
            errors.append(f"Source reference to unknown transaction '{sid}'.")
        elif stype == "finding" and sid not in allowed_findings:
            errors.append(f"Source reference to unknown finding '{sid}'.")
        elif stype == "baseline" and not sid.startswith("CUSTOMER-"):
            errors.append(f"Source reference to unknown baseline '{sid}'.")

    blob = " ".join(s.lower() for s in _strings_in(report or {}))
    for phrase in BANNED_PHRASES:
        if phrase in blob:
            errors.append(f"Forbidden verdict language detected: '{phrase}'.")

    return {"ok": len(errors) == 0, "errors": errors}
