import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.page import Page
from app.models.page_record import PageRecord
from app.models.page_version import PageVersion


def get_default_schema(page_id: str) -> dict[str, Any]:
    return {
        "id": page_id,
        "title": "用户管理",
        "pageType": "crud",
        "api": {
            "mode": "runtime",
            "listUrl": f"/api/runtime/pages/{page_id}/records",
            "createUrl": f"/api/runtime/pages/{page_id}/records",
            "updateUrl": f"/api/runtime/pages/{page_id}/records/:id",
            "deleteUrl": f"/api/runtime/pages/{page_id}/records/:id",
        },
        "fields": [
            {
                "id": "field_username",
                "label": "用户名",
                "prop": "username",
                "type": "input",
                "required": False,
                "searchable": True,
                "tableVisible": True,
                "formVisible": True,
                "placeholder": "请输入用户名",
                "defaultValue": "",
                "maxLength": 50,
                "options": [],
            }
        ],
        "table": {
            "rowKey": "id",
            "columns": [],
            "actions": ["edit", "delete"],
        },
        "formDialog": {
            "title": "编辑数据",
            "width": "600px",
        },
        "charts": [],
    }


def get_or_create_page(db: Session, page_id: str) -> Page:
    page = db.query(Page).filter(Page.page_key == page_id).first()

    if page:
        return page

    page = Page(
        page_key=page_id,
        name="用户管理",
        status="draft",
        schema_json=json.dumps(get_default_schema(page_id), ensure_ascii=False),
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
    }


def create_page_version(
    db: Session,
    page: Page,
    schema_json: dict[str, Any],
    message: str = "保存页面配置",
) -> PageVersion:
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
    db.add(version)
    return version


def save_page_schema(
    db: Session,
    page_id: str,
    name: str,
    schema_json: dict[str, Any],
) -> Page:
    page = get_or_create_page(db, page_id)
    page.name = name or schema_json.get("title") or page.name
    page.schema_json = json.dumps(schema_json, ensure_ascii=False)
    page.status = "draft"
    db.add(page)
    create_page_version(db, page, schema_json)
    db.commit()
    db.refresh(page)
    return page


def publish_page(db: Session, page_id: str) -> Page:
    page = get_or_create_page(db, page_id)
    page.status = "published"
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


def record_to_response(record: PageRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "data": json.loads(record.data_json),
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def list_page_records(
    db: Session,
    page_id: str,
    filters: dict[str, str],
    page: int,
    page_size: int,
) -> dict[str, Any]:
    page_obj = get_or_create_page(db, page_id)
    records = (
        db.query(PageRecord)
        .filter(PageRecord.page_id == page_obj.id)
        .order_by(PageRecord.id.desc())
        .all()
    )

    normalized_filters = {
        key: value.strip().lower()
        for key, value in filters.items()
        if value is not None and value.strip()
    }

    def matches(record: PageRecord) -> bool:
        data = json.loads(record.data_json)
        for key, expected in normalized_filters.items():
            actual = str(data.get(key, "")).lower()
            if expected not in actual:
                return False
        return True

    matched_records = [record for record in records if matches(record)]
    safe_page = max(page, 1)
    safe_page_size = max(min(page_size, 100), 1)
    start = (safe_page - 1) * safe_page_size
    end = start + safe_page_size

    return {
        "items": [record_to_response(record) for record in matched_records[start:end]],
        "total": len(matched_records),
        "page": safe_page,
        "pageSize": safe_page_size,
    }


def create_page_record(db: Session, page_id: str, data: dict[str, Any]) -> PageRecord:
    page_obj = get_or_create_page(db, page_id)
    record = PageRecord(
        page_id=page_obj.id,
        data_json=json.dumps(data, ensure_ascii=False),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_page_record(
    db: Session,
    page_id: str,
    record_id: int,
    data: dict[str, Any],
) -> PageRecord | None:
    page_obj = get_or_create_page(db, page_id)
    record = (
        db.query(PageRecord)
        .filter(PageRecord.page_id == page_obj.id, PageRecord.id == record_id)
        .first()
    )

    if not record:
        return None

    record.data_json = json.dumps(data, ensure_ascii=False)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def delete_page_record(db: Session, page_id: str, record_id: int) -> bool:
    page_obj = get_or_create_page(db, page_id)
    record = (
        db.query(PageRecord)
        .filter(PageRecord.page_id == page_obj.id, PageRecord.id == record_id)
        .first()
    )

    if not record:
        return False

    db.delete(record)
    db.commit()
    return True


def list_page_versions(db: Session, page_id: str) -> list[dict[str, Any]]:
    page_obj = get_or_create_page(db, page_id)
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
    page_obj = get_or_create_page(db, page_id)
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
) -> Page | None:
    page_obj = get_or_create_page(db, page_id)
    version = (
        db.query(PageVersion)
        .filter(PageVersion.page_id == page_obj.id, PageVersion.id == version_id)
        .first()
    )

    if not version:
        return None

    schema_json = json.loads(version.schema_json)
    page_obj.schema_json = json.dumps(schema_json, ensure_ascii=False)
    page_obj.name = schema_json.get("title") or page_obj.name
    page_obj.status = "draft"
    db.add(page_obj)
    create_page_version(
        db,
        page_obj,
        schema_json,
        message=f"恢复到版本 {version.version_no}",
    )
    db.commit()
    db.refresh(page_obj)
    return page_obj
