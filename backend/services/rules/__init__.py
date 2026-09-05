"""Rule registry — single place mapping rule_id → module.

Each rule module exposes: RULE_ID, RULE_NAME, DESCRIPTION, evaluate(...).
The engine runs all rules or one specific rule without hardcoding logic.
"""

from backend.services.rules import (
    r01_large_transaction,
    r02_new_payee_burst,
    r03_odd_hours,
    r04_behavioral_deviation,
    r05_transaction_burst,
)

REGISTRY = {
    r01_large_transaction.RULE_ID: r01_large_transaction,
    r02_new_payee_burst.RULE_ID: r02_new_payee_burst,
    r03_odd_hours.RULE_ID: r03_odd_hours,
    r04_behavioral_deviation.RULE_ID: r04_behavioral_deviation,
    r05_transaction_burst.RULE_ID: r05_transaction_burst,
}

RULE_IDS = ["R01", "R02", "R03", "R04", "R05"]


def get_rule(rule_id: str):
    return REGISTRY.get(rule_id)
