from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.page_schema import PageSchemaResponse, PageSchemaUpdate
from app.services.page_service import get_or_create_page, page_to_response, publish_page, save_page_schema

router = APIRouter(prefix="/pages", tags=["pages"])


@router.get("/{page_id}", response_model=PageSchemaResponse)
def get_page(page_id: str, db: Session = Depends(get_db)):
    page = get_or_create_page(db, page_id)
    return page_to_response(page)


@router.put("/{page_id}/schema", response_model=PageSchemaResponse)
def update_page_schema(
    page_id: str,
    payload: PageSchemaUpdate,
    db: Session = Depends(get_db),
):
    page = save_page_schema(db, page_id, payload.name, payload.schema_data)
    return page_to_response(page)


@router.post("/{page_id}/publish", response_model=PageSchemaResponse)
def publish_page_schema(page_id: str, db: Session = Depends(get_db)):
    page = publish_page(db, page_id)
    return page_to_response(page)
