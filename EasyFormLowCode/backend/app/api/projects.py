from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.page_schema import (
    PageCreate,
    PageMetadataUpdate,
    PageSummaryResponse,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.page_catalog_service import (
    create_page,
    delete_page,
    page_to_summary,
    update_page_metadata,
)
from app.services.project_service import (
    create_project,
    get_project,
    list_project_pages,
    list_projects,
    project_to_response,
    update_project,
)

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=list[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return list_projects(db)


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_new_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    try:
        return project_to_response(create_project(db, payload.name))
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
def update_project_name(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    try:
        project = update_project(db, project_id, payload.name)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if not project:
        raise HTTPException(status_code=404, detail="project not found")
    return project_to_response(project)


@router.get("/projects/{project_id}/pages", response_model=list[PageSummaryResponse])
def get_project_pages(project_id: int, db: Session = Depends(get_db)):
    if not get_project(db, project_id):
        raise HTTPException(status_code=404, detail="project not found")
    return list_project_pages(db, project_id)


@router.post("/projects/{project_id}/pages", response_model=PageSummaryResponse, status_code=status.HTTP_201_CREATED)
def create_project_page(project_id: int, payload: PageCreate, db: Session = Depends(get_db)):
    try:
        page = create_page(db, project_id, payload.page_id, payload.name, payload.entity_id, payload.template_key)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        status_code = 409 if "already exists" in str(error) else 422
        raise HTTPException(status_code=status_code, detail=str(error)) from error
    return page_to_summary(page)


@router.patch("/pages/{page_id}/metadata", response_model=PageSummaryResponse)
def update_page_name(page_id: str, payload: PageMetadataUpdate, db: Session = Depends(get_db)):
    try:
        page = update_page_metadata(db, page_id, payload.name)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if not page:
        raise HTTPException(status_code=404, detail="page not found")
    return page_to_summary(page)


@router.delete("/pages/{page_id}")
def delete_project_page(page_id: str, db: Session = Depends(get_db)):
    if not delete_page(db, page_id):
        raise HTTPException(status_code=404, detail="page not found")
    return {"ok": True}
