import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.entity import Entity
from app.models.page import Page
from app.models.page_record import PageRecord
from app.models.page_version import PageVersion
from app.services.entity_service import build_entity_page_schema
from app.services.page_version_service import create_page_version
from app.services.project_service import get_project, normalize_entity_name
from app.services.schema_contract import create_crud_template


def create_page(
    db: Session,
    project_id: int,
    page_id: str,
    name: str,
    entity_id: int | None = None,
    template_key: str | None = None,
) -> Page:
    if not get_project(db, project_id):
        raise LookupError("project not found")
    if db.query(Page).filter(Page.page_key == page_id).first():
        raise ValueError("page id already exists")

    normalized_name = normalize_entity_name(name, "page")
    entity = db.query(Entity).filter(Entity.id == entity_id).first() if entity_id else None
    if entity_id and (not entity or entity.project_id != project_id):
        raise ValueError("entity does not belong to this project")
    selected_template = template_key or "standard_crud"
    if selected_template not in {"standard_crud", "master_data", "operations_dashboard"}:
        raise ValueError("template key is invalid")
    schema_json = build_entity_page_schema(db, entity, selected_template) if entity else create_crud_template(page_id, normalized_name)
    schema_json["id"] = page_id
    schema_json["title"] = normalized_name
    page = Page(
        project_id=project_id,
        entity_id=entity.id if entity else None,
        template_key=selected_template if entity else None,
        page_key=page_id,
        name=normalized_name,
        status="draft",
        schema_json=json.dumps(schema_json, ensure_ascii=False),
    )
    db.add(page)
    db.flush()
    create_page_version(db, page, schema_json, message="鍒涘缓鍚庡彴 CRUD 椤甸潰")
    db.commit()
    db.refresh(page)
    return page


def update_page_metadata(db: Session, page_id: str, name: str) -> Page | None:
    page = db.query(Page).filter(Page.page_key == page_id).first()
    if not page:
        return None
    page.name = normalize_entity_name(name, "page")
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


def delete_page(db: Session, page_id: str) -> bool:
    page = db.query(Page).filter(Page.page_key == page_id).first()
    if not page:
        return False
    db.query(PageRecord).filter(PageRecord.page_id == page.id).delete(synchronize_session=False)
    db.query(PageVersion).filter(PageVersion.page_id == page.id).delete(synchronize_session=False)
    db.delete(page)
    db.commit()
    return True


def page_to_summary(page: Page) -> dict[str, Any]:
    from app.services.page_schema_service import get_published_version_no

    return {
        "page_id": page.page_key,
        "project_id": page.project_id,
        "name": page.name,
        "status": page.status,
        "has_published": bool(page.published_schema_json),
        "updated_at": page.updated_at.isoformat(),
        "published_version_no": get_published_version_no(page),
        "published_at": page.published_at.isoformat() if page.published_at else None,
        "entity_id": page.entity_id,
        "template_key": page.template_key,
    }
