"""Regenerate the Phase 1 dataset deterministically.

Usage:
    python scripts/generate_data.py [--seed 42]

Production app does NOT regenerate on startup; generated CSV/JSON
files are committed to the repository.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.services.baseline import calculate_all_baselines, calculate_payee_baselines
from backend.services.data_generator import SEED, generate_dataset, save_dataset
from backend.services.data_validation import validate_dataset

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate RiskLens AI Phase 1 dataset")
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()

    customers, transactions, metadata, _profiles = generate_dataset(seed=args.seed)
    baselines = calculate_all_baselines(transactions)
    payee_baselines = calculate_payee_baselines(transactions)
    save_dataset(customers, transactions, metadata, baselines, payee_baselines, DATA_DIR)

    result = validate_dataset(transactions, customers)
    print(f"customers={len(customers)} transactions={len(transactions)} "
          f"range={metadata['date_start']}..{metadata['date_end']}")
    print(f"valid={result['valid']} errors={len(result['errors'])} "
          f"warnings={len(result['warnings'])}")
    for e in result["errors"][:10]:
        print("ERROR:", e)
    for w in result["warnings"][:10]:
        print("WARN:", w)
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
