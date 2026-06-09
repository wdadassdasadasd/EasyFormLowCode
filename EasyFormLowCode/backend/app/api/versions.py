from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.page_schema import PageSchemaResponse, PageVersionResponse
from app.services.page_service import (
    get_page_version,
    list_page_versions,
    page_to_response,
    restore_page_version,
    version_to_response,
)

router = APIRouter(prefix="/pages", tags=["versions"])


@router.get(
    "/{page_id}/versions",
    response_model=list[PageVersionResponse],
)
def get_page_versions(page_id: str, db: Session = Depends(get_db)):
    return list_page_versions(db, page_id)


@router.get(
    "/{page_id}/versions/{version_id}",
    response_model=PageVersionResponse,
)
def get_page_version_detail(
    page_id: str,
    version_id: int,
    db: Session = Depends(get_db),
):
    version = get_page_version(db, page_id, version_id)

    if not version:
        raise HTTPException(status_code=404, detail="version not found")

    return version_to_response(version)


@router.post(
    "/{page_id}/versions/{version_id}/restore",
    response_model=PageSchemaResponse,
)
def restore_page_version_schema(
    page_id: str,
    version_id: int,
    db: Session = Depends(get_db),
):
    page = restore_page_version(db, page_id, version_id)

    if not page:
        raise HTTPException(status_code=404, detail="version not found")

    return page_to_response(page)
