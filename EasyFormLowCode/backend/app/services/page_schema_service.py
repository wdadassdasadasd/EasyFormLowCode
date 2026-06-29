import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, object_session

from app.models.entity import Entity
from app.models.page import Page
from app.models.page_version import PageVersion
from app.services.entity_page_sync_service import merge_entity_page_schema
from app.services.entity_service import build_entity_page_schema
from app.services.page_catalog_service import page_to_summary
from app.services.page_version_service import create_page_version
from app.services.project_service import get_default_project
from app.services.schema_contract import (
    get_minimal_schema,
    get_page_schema_validation_errors,
    normalize_page_schema,
)


def get_or_create_page(db: Session, page_id: str) -> Page:
    page = db.query(Page).filter(Page.page_key == page_id).first()

    if page:
        return page

    page = Page(
        project_id=get_default_project(db).id,
        page_key=page_id,
        name="鐢ㄦ埛绠＄悊",
        status="draft",
        schema_json=json.dumps(get_minimal_schema(page_id), ensure_ascii=False),
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


def page_to_response(page: Page) -> dict[str, Any]:
    return {
        "page_id": page.page_key,
        "name": page.name,
        "status": page.status,
        "schema_json": json.loads(page.schema_json),
        "entity_id": page.entity_id,
        "template_key": page.template_key,
        "published_version_no": get_published_version_no(page),
        "published_at": page.published_at.isoformat() if page.published_at else None,
    }


def page_to_published_response(page: Page) -> dict[str, Any]:
    schema_json = page.published_schema_json or page.schema_json
    return {
        "page_id": page.page_key,
        "name": page.name,
        "status": "published" if page.published_schema_json else page.status,
        "schema_json": json.loads(schema_json),
        "entity_id": page.entity_id,
        "template_key": page.template_key,
        "published_version_no": get_published_version_no(page),
        "published_at": page.published_at.isoformat() if page.published_at else None,
    }


def list_pages(db: Session) -> list[dict[str, Any]]:
    pages = db.query(Page).order_by(Page.updated_at.desc()).all()

    if not pages:
        pages = [get_or_create_page(db, "user_manage")]

    return [page_to_summary(page) for page in pages]


def get_published_version_no(page: Page) -> int | None:
    if not page.published_version_id:
        return None
    db = object_session(page)
    if not db:
        return None
    version = db.query(PageVersion).filter(PageVersion.id == page.published_version_id).first()
    return version.version_no if version else None


def save_page_schema(
    db: Session,
    page_id: str,
    name: str,
    schema_json: dict[str, Any],
) -> Page:
    page = get_or_create_page(db, page_id)
    source_schema = dict(schema_json or {}) if isinstance(schema_json, dict) else {}
    if page.entity_id:
        entity = db.query(Entity).filter(Entity.id == page.entity_id).first()
        if entity:
            generated = build_entity_page_schema(db, entity, page.template_key or "standard_crud")
            source_schema = merge_entity_page_schema(source_schema, generated)
    validation_errors = get_page_schema_validation_errors(source_schema)
    if validation_errors:
        raise ValueError("; ".join(validation_errors))

    normalized_schema = normalize_page_schema(page_id, source_schema)
    page.name = name or normalized_schema.get("title") or page.name
    page.schema_json = json.dumps(normalized_schema, ensure_ascii=False)
    page.status = "draft"
    db.add(page)
    create_page_version(db, page, normalized_schema)
    db.commit()
    db.refresh(page)
    return page


def publish_page(db: Session, page_id: str) -> Page:
    page = get_or_create_page(db, page_id)
    latest_version = (
        db.query(PageVersion)
        .filter(PageVersion.page_id == page.id)
        .order_by(PageVersion.version_no.desc())
        .first()
    )
    if not latest_version:
        latest_version = create_page_version(
            db,
            page,
            json.loads(page.schema_json),
            message="鍙戝竷椤甸潰閰嶇疆",
        )
        db.flush()
    page.published_schema_json = page.schema_json
    page.published_version_id = latest_version.id
    page.published_at = datetime.now(timezone.utc)
    page.status = "published"
    db.add(page)
    db.commit()
    db.refresh(page)
    return page
