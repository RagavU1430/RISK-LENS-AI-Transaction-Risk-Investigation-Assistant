"""Phase 1 — minimal developer data-status endpoint (no analysis)."""

from fastapi import APIRouter

from backend.models import DataStatus, DataStatusDateRange
from backend.services import data_loader

router = APIRouter()


@router.get("/data/status", response_model=DataStatus)
def data_status() -> DataStatus:
    txs = data_loader.load_transactions()
    customers = data_loader.load_customers()
    meta = data_loader.load_metadata()
    if not txs:
        return DataStatus(dataset_loaded=False, customers=len(customers),
                          transactions=0)
    stamps = sorted(t.get("timestamp", "") for t in txs)
    start = meta.get("date_start") or (stamps[0][:10] if stamps else None)
    end = meta.get("date_end") or (stamps[-1][:10] if stamps else None)
    return DataStatus(dataset_loaded=True, customers=len(customers),
                      transactions=len(txs),
                      date_range=DataStatusDateRange(start=start, end=end))
