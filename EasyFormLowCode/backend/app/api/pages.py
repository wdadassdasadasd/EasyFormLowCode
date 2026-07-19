from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.page_schema import PageRevisionCommand, PageSchemaResponse, PageSchemaUpdate, PageSummaryResponse
from app.services.entity_page_sync_service import sync_entity_page
from app.services.page_schema_service import (
    get_page_by_key,
    list_pages,
    page_to_published_response,
    page_to_response,
    publish_page,
    save_page_schema,
)
from app.services.page_version_service import PageVersionConflictError
from app.services.page_revision_service import SchemaRevisionConflictError

router = APIRouter(prefix="/pages", tags=["pages"])


@router.get("", response_model=list[PageSummaryResponse])
def get_pages(db: Session = Depends(get_db)):
    return list_pages(db)


@router.get("/{page_id}", response_model=PageSchemaResponse)
def get_page(page_id: str, db: Session = Depends(get_db)):
    page = get_page_by_key(db, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="page not found")
    return page_to_response(page)


@router.get("/{page_id}/published", response_model=PageSchemaResponse)
def get_published_page(page_id: str, db: Session = Depends(get_db)):
    page = get_page_by_key(db, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="page not found")
    return page_to_published_response(page)


@router.put("/{page_id}/schema", response_model=PageSchemaResponse)
def update_page_schema(
    page_id: str,
    payload: PageSchemaUpdate,
    db: Session = Depends(get_db),
):
    try:
        page = save_page_schema(db, page_id, payload.name, payload.schema_data, payload.expected_revision)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except PageVersionConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except SchemaRevisionConflictError as error:
        raise HTTPException(status_code=409, detail=error.to_detail()) from error
    return page_to_response(page)


@router.post("/{page_id}/sync-entity", response_model=PageSchemaResponse)
def sync_page_entity(page_id: str, payload: PageRevisionCommand, db: Session = Depends(get_db)):
    try:
        page = sync_entity_page(db, page_id, payload.expected_revision)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except PageVersionConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except SchemaRevisionConflictError as error:
        raise HTTPException(status_code=409, detail=error.to_detail()) from error
    if not page:
        raise HTTPException(status_code=404, detail="page not found")
    return page_to_response(page)


@router.post("/{page_id}/publish", response_model=PageSchemaResponse)
def publish_page_schema(page_id: str, payload: PageRevisionCommand, db: Session = Depends(get_db)):
    try:
        page = publish_page(db, page_id, payload.expected_revision)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except PageVersionConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except SchemaRevisionConflictError as error:
        raise HTTPException(status_code=409, detail=error.to_detail()) from error
    return page_to_response(page)
