from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.page_schema import PageSchemaResponse, PageSchemaUpdate, PageSummaryResponse
from app.services.page_service import (
    get_or_create_page,
    list_pages,
    page_to_published_response,
    page_to_response,
    publish_page,
    save_page_schema,
)

router = APIRouter(prefix="/pages", tags=["pages"])


@router.get("", response_model=list[PageSummaryResponse])
def get_pages(db: Session = Depends(get_db)):
    return list_pages(db)


@router.get("/{page_id}", response_model=PageSchemaResponse)
def get_page(page_id: str, db: Session = Depends(get_db)):
    page = get_or_create_page(db, page_id)
    return page_to_response(page)


@router.get("/{page_id}/published", response_model=PageSchemaResponse)
def get_published_page(page_id: str, db: Session = Depends(get_db)):
    page = get_or_create_page(db, page_id)
    return page_to_published_response(page)


@router.put("/{page_id}/schema", response_model=PageSchemaResponse)
def update_page_schema(
    page_id: str,
    payload: PageSchemaUpdate,
    db: Session = Depends(get_db),
):
    try:
        page = save_page_schema(db, page_id, payload.name, payload.schema_data)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return page_to_response(page)


@router.post("/{page_id}/publish", response_model=PageSchemaResponse)
def publish_page_schema(page_id: str, db: Session = Depends(get_db)):
    page = publish_page(db, page_id)
    return page_to_response(page)
