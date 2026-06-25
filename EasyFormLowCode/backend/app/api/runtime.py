from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.page_schema import BatchDeletePayload, RuntimeRecordListResponse, RuntimeRecordPayload, RuntimeRecordResponse, RuntimeStatsResponse
from app.services.page_service import (
    create_page_record,
    delete_page_records,
    delete_page_record,
    get_runtime_schema,
    list_page_records,
    list_page_record_stats,
    record_to_response,
    update_page_record,
)
from app.services.entity_service import (
    create_entity_record,
    delete_entity_record,
    delete_entity_records,
    entity_record_to_response,
    get_entity,
    list_entity_record_stats,
    list_entity_records,
    update_entity_record,
)
from app.models.page import Page

router = APIRouter(prefix="/runtime/pages", tags=["runtime"])


def get_page(db: Session, page_id: str) -> Page | None:
    return db.query(Page).filter(Page.page_key == page_id).first()


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
    page_obj = get_page(db, page_id)
    filters = {
        key: value
        for key, value in request.query_params.items()
        if key not in {"page", "pageSize", "mode"}
    }
    entity_id = page_obj.entity_id if page_obj else None
    if entity_id:
        return list_entity_records(db, entity_id, filters, page, pageSize)
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
    page_obj = get_page(db, page_id)
    filters = {
        key: value
        for key, value in request.query_params.items()
        if key not in {"page", "pageSize", "mode"}
    }
    entity_id = page_obj.entity_id if page_obj else None
    if entity_id:
        return list_entity_record_stats(db, entity_id, filters, get_runtime_schema(page_obj, mode))
    return list_page_record_stats(db, page_id, filters, mode=mode)


@router.post(
    "/{page_id}/records",
    response_model=RuntimeRecordResponse,
)
def create_runtime_record(
    page_id: str,
    payload: RuntimeRecordPayload,
    mode: str = "published",
    db: Session = Depends(get_db),
):
    try:
        page_obj = get_page(db, page_id)
        entity_id = page_obj.entity_id if page_obj else None
        if entity_id:
            record = create_entity_record(db, entity_id, payload.data)
            return entity_record_to_response(db, record)
        record = create_page_record(db, page_id, payload.data, mode=mode)
    except (LookupError, ValueError) as error:
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
    mode: str = "published",
    db: Session = Depends(get_db),
):
    try:
        page_obj = get_page(db, page_id)
        entity_id = page_obj.entity_id if page_obj else None
        if entity_id:
            record = update_entity_record(db, entity_id, record_id, payload.data)
            if not record:
                raise HTTPException(status_code=404, detail="record not found")
            return entity_record_to_response(db, record)
        record = update_page_record(db, page_id, record_id, payload.data, mode=mode)
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
    try:
        page_obj = get_page(db, page_id)
        entity_id = page_obj.entity_id if page_obj else None
        deleted = delete_entity_record(db, entity_id, record_id) if entity_id else delete_page_record(db, page_id, record_id)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

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
        page_obj = get_page(db, page_id)
        entity_id = page_obj.entity_id if page_obj else None
        deleted = delete_entity_records(db, entity_id, payload.record_ids) if entity_id else delete_page_records(db, page_id, payload.record_ids)
    except ValueError as error:
        status_code = 404 if "not found" in str(error) else 422
        raise HTTPException(status_code=status_code, detail=str(error)) from error
    return {"ok": True, "deleted": deleted}
