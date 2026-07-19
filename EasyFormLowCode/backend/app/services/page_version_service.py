import json
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.page import Page
from app.models.page_version import PageVersion
from app.services.schema_contract import normalize_page_schema
from app.services.page_revision_service import require_schema_revision, update_page_with_revision


class PageVersionConflictError(RuntimeError):
    pass


def create_page_version(
    db: Session,
    page: Page,
    schema_json: dict[str, Any],
    message: str = "淇濆瓨椤甸潰閰嶇疆",
) -> PageVersion:
    for _ in range(3):
        latest = (
            db.query(PageVersion)
            .filter(PageVersion.page_id == page.id)
            .order_by(PageVersion.version_no.desc())
            .first()
        )
        version = PageVersion(
            page_id=page.id,
            version_no=(latest.version_no + 1) if latest else 1,
            message=message,
            schema_json=json.dumps(schema_json, ensure_ascii=False),
        )
        try:
            with db.begin_nested():
                db.add(version)
                db.flush()
            return version
        except IntegrityError:
            continue
    raise PageVersionConflictError("page version conflict, please retry")


def list_page_versions(db: Session, page_id: str) -> list[dict[str, Any]]:
    from app.services.page_schema_service import get_page_by_key

    page_obj = get_page_by_key(db, page_id)
    if not page_obj:
        raise LookupError("page not found")
    versions = (
        db.query(PageVersion)
        .filter(PageVersion.page_id == page_obj.id)
        .order_by(PageVersion.version_no.desc())
        .all()
    )
    return [version_to_response(version) for version in versions]


def get_page_version(
    db: Session,
    page_id: str,
    version_id: int,
) -> PageVersion | None:
    from app.services.page_schema_service import get_page_by_key

    page_obj = get_page_by_key(db, page_id)
    if not page_obj:
        raise LookupError("page not found")
    return (
        db.query(PageVersion)
        .filter(PageVersion.page_id == page_obj.id, PageVersion.id == version_id)
        .first()
    )


def version_to_response(version: PageVersion) -> dict[str, Any]:
    return {
        "id": version.id,
        "version_no": version.version_no,
        "message": version.message,
        "schema_json": json.loads(version.schema_json),
        "created_at": version.created_at.isoformat(),
    }


def restore_page_version(
    db: Session,
    page_id: str,
    version_id: int,
    expected_revision: int | None = None,
) -> Page | None:
    from app.services.page_schema_service import get_page_by_key

    page_obj = get_page_by_key(db, page_id)
    if not page_obj:
        raise LookupError("page not found")
    require_schema_revision(page_obj, expected_revision)
    version = (
        db.query(PageVersion)
        .filter(PageVersion.page_id == page_obj.id, PageVersion.id == version_id)
        .first()
    )

    if not version:
        return None

    schema_json = normalize_page_schema(page_id, json.loads(version.schema_json))
    page_obj = update_page_with_revision(
        db,
        page_obj,
        expected_revision,
        {
            "schema_json": json.dumps(schema_json, ensure_ascii=False),
            "name": schema_json.get("title") or page_obj.name,
            "status": "draft",
        },
    )
    create_page_version(
        db,
        page_obj,
        schema_json,
        message=f"恢复到版本 {version.version_no}",
    )
    db.commit()
    db.refresh(page_obj)
    return page_obj
