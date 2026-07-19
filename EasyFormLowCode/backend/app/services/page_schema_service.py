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
from app.services.page_revision_service import require_schema_revision, update_page_with_revision
from app.services.project_service import get_default_project
from app.services.schema_contract import (
    get_minimal_schema,
    get_page_schema_validation_errors,
    normalize_page_schema,
)


def get_page_by_key(db: Session, page_id: str) -> Page | None:
    return db.query(Page).filter(Page.page_key == page_id).first()


def get_or_create_page(db: Session, page_id: str) -> Page:
    page = get_page_by_key(db, page_id)

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
        "schema_revision": page.schema_revision,
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
        "schema_revision": page.schema_revision,
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
    expected_revision: int | None = None,
) -> Page:
    page = get_page_by_key(db, page_id)
    is_new_page = page is None
    if page:
        require_schema_revision(page, expected_revision)
    else:
        page = Page(
            project_id=get_default_project(db).id,
            page_key=page_id,
            name="用户管理",
            status="draft",
            schema_json=json.dumps(get_minimal_schema(page_id), ensure_ascii=False),
        )
        db.add(page)
        db.flush()
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
    next_name = name or normalized_schema.get("title") or page.name
    next_schema_json = json.dumps(normalized_schema, ensure_ascii=False)
    if is_new_page:
        page.name = next_name
        page.schema_json = next_schema_json
        page.status = "draft"
        db.add(page)
    else:
        page = update_page_with_revision(
            db,
            page,
            expected_revision,
            {"name": next_name, "schema_json": next_schema_json, "status": "draft"},
        )
    create_page_version(db, page, normalized_schema)
    db.commit()
    db.refresh(page)
    return page


def publish_page(db: Session, page_id: str, expected_revision: int | None = None) -> Page:
    page = get_page_by_key(db, page_id)
    if not page:
        raise LookupError("page not found")
    require_schema_revision(page, expected_revision)
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
