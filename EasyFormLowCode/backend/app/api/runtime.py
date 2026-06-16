from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.page_schema import RuntimeRecordListResponse, RuntimeRecordPayload, RuntimeRecordResponse, RuntimeStatsResponse
from app.services.page_service import (
    create_page_record,
    delete_page_record,
    list_page_records,
    list_page_record_stats,
    record_to_response,
    update_page_record,
)

router = APIRouter(prefix="/runtime/pages", tags=["runtime"])


@router.get(
    "/{page_id}/records",
    response_model=RuntimeRecordListResponse,
)
def get_runtime_records(
    page_id: str,
    request: Request,
    page: int = 1,
    pageSize: int = 10,
    db: Session = Depends(get_db),
):
    filters = {
        key: value
        for key, value in request.query_params.items()
        if key not in {"page", "pageSize"}
    }
    return list_page_records(db, page_id, filters, page, pageSize)


@router.get(
    "/{page_id}/stats",
    response_model=RuntimeStatsResponse,
)
def get_runtime_stats(
    page_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    filters = {
        key: value
        for key, value in request.query_params.items()
        if key not in {"page", "pageSize"}
    }
    return list_page_record_stats(db, page_id, filters)


@router.post(
    "/{page_id}/records",
    response_model=RuntimeRecordResponse,
)
def create_runtime_record(
    page_id: str,
    payload: RuntimeRecordPayload,
    db: Session = Depends(get_db),
):
    record = create_page_record(db, page_id, payload.data)
    return record_to_response(record)


@router.put(
    "/{page_id}/records/{record_id}",
    response_model=RuntimeRecordResponse,
)
def update_runtime_record(
    page_id: str,
    record_id: int,
    payload: RuntimeRecordPayload,
    db: Session = Depends(get_db),
):
    record = update_page_record(db, page_id, record_id, payload.data)

    if not record:
        raise HTTPException(status_code=404, detail="record not found")

    return record_to_response(record)


@router.delete("/{page_id}/records/{record_id}")
def delete_runtime_record(
    page_id: str,
    record_id: int,
    db: Session = Depends(get_db),
):
    deleted = delete_page_record(db, page_id, record_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="record not found")

    return {"ok": True}
