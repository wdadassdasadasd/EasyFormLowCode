from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.page_schema import PageRevisionCommand, PageSchemaResponse, PageVersionResponse
from app.services.page_schema_service import page_to_response
from app.services.page_version_service import (
    get_page_version,
    list_page_versions,
    restore_page_version,
    version_to_response,
)
from app.services.page_revision_service import SchemaRevisionConflictError

router = APIRouter(prefix="/pages", tags=["versions"])


@router.get(
    "/{page_id}/versions",
    response_model=list[PageVersionResponse],
)
def get_page_versions(page_id: str, db: Session = Depends(get_db)):
    try:
        return list_page_versions(db, page_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get(
    "/{page_id}/versions/{version_id}",
    response_model=PageVersionResponse,
)
def get_page_version_detail(
    page_id: str,
    version_id: int,
    db: Session = Depends(get_db),
):
    try:
        version = get_page_version(db, page_id, version_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

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
    payload: PageRevisionCommand,
    db: Session = Depends(get_db),
):
    try:
        page = restore_page_version(db, page_id, version_id, payload.expected_revision)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except SchemaRevisionConflictError as error:
        raise HTTPException(status_code=409, detail=error.to_detail()) from error

    if not page:
        raise HTTPException(status_code=404, detail="version not found")

    return page_to_response(page)
