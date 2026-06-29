import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.page import Page
from app.models.page_record import PageRecord
from app.services.analytics_service import build_stats_payload
from app.services.schema_contract import validate_record_data


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
    mode: str = "published",
) -> dict[str, Any]:
    from app.services.page_schema_service import get_or_create_page

    page_obj = get_or_create_page(db, page_id)
    safe_page = max(page, 1)
    safe_page_size = max(min(page_size, 100), 1)
    normalized_filters = normalize_record_filters(page_obj, filters, mode=mode)

    query = db.query(PageRecord).filter(PageRecord.page_id == page_obj.id)

    if normalized_filters:
        records = query.order_by(PageRecord.id.desc()).all()
        matched_records = [record for record in records if record_matches_filters(record, normalized_filters)]
        total = len(matched_records)
        max_page = max((total + safe_page_size - 1) // safe_page_size, 1)
        safe_page = min(safe_page, max_page)
        start = (safe_page - 1) * safe_page_size
        end = start + safe_page_size
        page_records = matched_records[start:end]
    else:
        total = query.count()
        max_page = max((total + safe_page_size - 1) // safe_page_size, 1)
        safe_page = min(safe_page, max_page)
        page_records = (
            query.order_by(PageRecord.id.desc())
            .offset((safe_page - 1) * safe_page_size)
            .limit(safe_page_size)
            .all()
        )

    return {
        "items": [record_to_response(record) for record in page_records],
        "total": total,
        "page": safe_page,
        "pageSize": safe_page_size,
    }


def list_page_record_stats(
    db: Session,
    page_id: str,
    filters: dict[str, str],
    mode: str = "published",
) -> dict[str, Any]:
    from app.services.page_schema_service import get_or_create_page

    page_obj = get_or_create_page(db, page_id)
    schema_json = get_runtime_schema(page_obj, mode)
    normalized_filters = normalize_record_filters(page_obj, filters, mode=mode)
    records = (
        db.query(PageRecord)
        .filter(PageRecord.page_id == page_obj.id)
        .order_by(PageRecord.id.desc())
        .all()
    )
    matched_records = [record for record in records if record_matches_filters(record, normalized_filters)]
    rows = [
        {
            "id": record.id,
            **json.loads(record.data_json),
        }
        for record in matched_records
    ]
    return build_stats_payload(db, schema_json, rows)


def normalize_record_filters(
    page_obj: Page,
    filters: dict[str, str],
    mode: str = "published",
) -> dict[str, str]:
    schema_json = get_runtime_schema(page_obj, mode)
    allowed_props = {
        str(field.get("prop"))
        for field in schema_json.get("fields", [])
        if isinstance(field, dict) and field.get("prop") and field.get("searchable", True)
    }

    if not allowed_props:
        allowed_props = set(filters.keys())

    return {
        key: value.strip().lower()
        for key, value in filters.items()
        if key in allowed_props and value is not None and value.strip()
    }


def get_runtime_schema(page_obj: Page, mode: str = "published") -> dict[str, Any]:
    if mode == "draft":
        return json.loads(page_obj.schema_json)

    snapshot = page_obj.published_schema_json or page_obj.schema_json
    return json.loads(snapshot)


def record_matches_filters(record: PageRecord, normalized_filters: dict[str, str]) -> bool:
    if not normalized_filters:
        return True

    data = json.loads(record.data_json)
    for key, expected in normalized_filters.items():
        actual = str(data.get(key, "")).lower()
        if expected not in actual:
            return False
    return True


def create_page_record(db: Session, page_id: str, data: dict[str, Any], mode: str = "published") -> PageRecord:
    from app.services.page_schema_service import get_or_create_page

    page_obj = get_or_create_page(db, page_id)
    validation_errors = validate_record_data(get_runtime_schema(page_obj, mode), data)
    if validation_errors:
        raise ValueError("; ".join(validation_errors))
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
    mode: str = "published",
) -> PageRecord | None:
    from app.services.page_schema_service import get_or_create_page

    page_obj = get_or_create_page(db, page_id)
    record = (
        db.query(PageRecord)
        .filter(PageRecord.page_id == page_obj.id, PageRecord.id == record_id)
        .first()
    )

    if not record:
        return None

    validation_errors = validate_record_data(get_runtime_schema(page_obj, mode), data)
    if validation_errors:
        raise ValueError("; ".join(validation_errors))

    record.data_json = json.dumps(data, ensure_ascii=False)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def delete_page_record(db: Session, page_id: str, record_id: int) -> bool:
    from app.services.page_schema_service import get_or_create_page

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


def delete_page_records(db: Session, page_id: str, record_ids: list[int]) -> int:
    from app.services.page_schema_service import get_or_create_page

    unique_ids = sorted(set(record_ids))
    if len(unique_ids) != len(record_ids):
        raise ValueError("record ids must be unique")
    page_obj = get_or_create_page(db, page_id)
    records = (
        db.query(PageRecord)
        .filter(PageRecord.page_id == page_obj.id, PageRecord.id.in_(unique_ids))
        .all()
    )
    if len(records) != len(unique_ids):
        raise ValueError("one or more records were not found")
    for record in records:
        db.delete(record)
    db.commit()
    return len(records)
