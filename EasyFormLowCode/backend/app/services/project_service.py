from typing import Any

from sqlalchemy.orm import Session, object_session

from app.models.page import Page
from app.models.project import Project


def normalize_entity_name(name: str, entity_label: str) -> str:
    normalized = (name or "").strip()
    if not normalized:
        raise ValueError(f"{entity_label} name is required")
    return normalized


def get_default_project(db: Session) -> Project:
    project = db.query(Project).order_by(Project.id).first()
    if project:
        return project

    project = Project(name="婕旂ず椤圭洰")
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_project(db: Session, project_id: int) -> Project | None:
    return db.query(Project).filter(Project.id == project_id).first()


def list_projects(db: Session) -> list[dict[str, Any]]:
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    if not projects:
        projects = [get_default_project(db)]
    return [project_to_response(project) for project in projects]


def project_to_response(project: Project) -> dict[str, Any]:
    return {
        "id": project.id,
        "name": project.name,
        "page_count": project_page_count(project),
        "updated_at": project.updated_at.isoformat(),
    }


def project_page_count(project: Project) -> int:
    db = object_session(project)
    if not db:
        return 0
    return db.query(Page).filter(Page.project_id == project.id).count()


def create_project(db: Session, name: str) -> Project:
    project = Project(name=normalize_entity_name(name, "project"))
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project_id: int, name: str) -> Project | None:
    project = get_project(db, project_id)
    if not project:
        return None
    project.name = normalize_entity_name(name, "project")
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def list_project_pages(db: Session, project_id: int) -> list[dict[str, Any]]:
    from app.services.page_catalog_service import page_to_summary

    pages = (
        db.query(Page)
        .filter(Page.project_id == project_id)
        .order_by(Page.updated_at.desc())
        .all()
    )
    return [page_to_summary(page) for page in pages]
