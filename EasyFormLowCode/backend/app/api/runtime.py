from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.page_schema import BatchDeletePayload, RuntimeRecordListResponse, RuntimeRecordPayload, RuntimeRecordResponse, RuntimeStatsResponse
from app.services.page_service import (
    create_page_record,
    delete_page_records,
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
    mode: str = "published",
    db: Session = Depends(get_db),
):
    filters = {
        key: value
        for key, value in request.query_params.items()
        if key not in {"page", "pageSize", "mode"}
    }
    return list_page_records(db, page_id, filters, page, pageSize, mode=mode)


@router.get(
    "/{page_id}/stats",
    response_model=RuntimeStatsResponse,
)
def get_runtime_stats(
    page_id: str,
    request: Request,
    mode: str = "published",
    db: Session = Depends(get_db),
):
    filters = {
        key: value
        for key, value in request.query_params.items()
        if key not in {"page", "pageSize", "mode"}
    }
    return list_page_record_stats(db, page_id, filters, mode=mode)


@router.post(
    "/{page_id}/records",
    response_model=RuntimeRecordResponse,
)
def create_runtime_record(
    page_id: str,
    payload: RuntimeRecordPayload,
    db: Session = Depends(get_db),
):
    try:
        record = create_page_record(db, page_id, payload.data)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
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
    try:
        record = update_page_record(db, page_id, record_id, payload.data)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

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


@router.delete("/{page_id}/records")
def delete_runtime_records(
    page_id: str,
    payload: BatchDeletePayload,
    db: Session = Depends(get_db),
):
    try:
        deleted = delete_page_records(db, page_id, payload.record_ids)
    except ValueError as error:
        status_code = 404 if "not found" in str(error) else 422
        raise HTTPException(status_code=status_code, detail=str(error)) from error
    return {"ok": True, "deleted": deleted}
