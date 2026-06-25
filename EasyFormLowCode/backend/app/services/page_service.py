import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, object_session

from app.models.page import Page
from app.models.page_record import PageRecord
from app.models.page_version import PageVersion
from app.models.project import Project
from app.models.entity import Entity
from app.services.analytics_service import build_stats_payload
from app.services.entity_service import build_entity_page_schema
from app.services.schema_contract import (
    create_crud_template,
    get_minimal_schema,
    get_page_schema_validation_errors,
    normalize_page_schema,
    validate_record_data,
)


def normalize_entity_name(name: str, entity_label: str) -> str:
    normalized = (name or "").strip()
    if not normalized:
        raise ValueError(f"{entity_label} name is required")
    return normalized


def get_default_project(db: Session) -> Project:
    project = db.query(Project).order_by(Project.id).first()
    if project:
        return project

    project = Project(name="演示项目")
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_or_create_page(db: Session, page_id: str) -> Page:
    page = db.query(Page).filter(Page.page_key == page_id).first()

    if page:
        return page

    page = Page(
        project_id=get_default_project(db).id,
        page_key=page_id,
        name="用户管理",
        status="draft",
        schema_json=json.dumps(get_minimal_schema(page_id), ensure_ascii=False),
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


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
    pages = (
        db.query(Page)
        .filter(Page.project_id == project_id)
        .order_by(Page.updated_at.desc())
        .all()
    )
    return [page_to_summary(page) for page in pages]


def create_page(db: Session, project_id: int, page_id: str, name: str, entity_id: int | None = None, template_key: str | None = None) -> Page:
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
    create_page_version(db, page, schema_json, message="创建后台 CRUD 页面")
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

    return [
        page_to_summary(page)
        for page in pages
    ]


def page_to_summary(page: Page) -> dict[str, Any]:
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


def get_published_version_no(page: Page) -> int | None:
    if not page.published_version_id:
        return None
    db = object_session(page)
    if not db:
        return None
    version = db.query(PageVersion).filter(PageVersion.id == page.published_version_id).first()
    return version.version_no if version else None


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
    validation_errors = get_page_schema_validation_errors(schema_json)
    if validation_errors:
        raise ValueError("; ".join(validation_errors))

    page = get_or_create_page(db, page_id)
    normalized_schema = normalize_page_schema(page_id, schema_json)
    page.name = name or normalized_schema.get("title") or page.name
    page.schema_json = json.dumps(normalized_schema, ensure_ascii=False)
    page.status = "draft"
    db.add(page)
    create_page_version(db, page, normalized_schema)
    db.commit()
    db.refresh(page)
    return page


def sync_entity_page(db: Session, page_id: str) -> Page | None:
    page = db.query(Page).filter(Page.page_key == page_id).first()
    if not page:
        return None
    if not page.entity_id:
        raise ValueError("page is not bound to an entity")
    entity = db.query(Entity).filter(Entity.id == page.entity_id).first()
    if not entity:
        raise ValueError("bound entity was not found")
    current = json.loads(page.schema_json)
    generated = build_entity_page_schema(db, entity, page.template_key or "standard_crud")
    existing_fields = {field.get("prop") for field in current.get("fields", []) if isinstance(field, dict)}
    additions = [field for field in generated["fields"] if field["prop"] not in existing_fields]
    current["schemaVersion"] = 4
    current["entity"] = generated["entity"]
    current["templateKey"] = page.template_key or "standard_crud"
    current["fields"] = [*current.get("fields", []), *additions]
    normalized = normalize_page_schema(page_id, current)
    page.schema_json = json.dumps(normalized, ensure_ascii=False)
    page.status = "draft"
    db.add(page)
    create_page_version(db, page, normalized, message="同步实体新增字段")
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
            message="发布页面配置",
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

    schema_json = normalize_page_schema(page_id, json.loads(version.schema_json))
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


def apply_field_reference_renames(schema_json: dict[str, Any], rename_map: dict[str, str]) -> None:
    if not rename_map:
        return
    for metric in schema_json.get("metrics", []):
        if isinstance(metric, dict) and metric.get("field") in rename_map:
            metric["field"] = rename_map[metric["field"]]
    for chart in schema_json.get("charts", []):
        if isinstance(chart, dict) and chart.get("dimension") in rename_map:
            chart["dimension"] = rename_map[chart["dimension"]]
    for query in schema_json.get("queries", []):
        if isinstance(query, dict) and query.get("fieldProp") in rename_map:
            query["fieldProp"] = rename_map[query["fieldProp"]]


def merge_entity_page_schema(current: dict[str, Any], generated: dict[str, Any]) -> dict[str, Any]:
    merged = dict(current or {})
    generated_fields = [field for field in generated.get("fields", []) if isinstance(field, dict)]
    generated_by_id = {field.get("entityFieldId"): field for field in generated_fields if field.get("entityFieldId") is not None}
    generated_by_prop = {field.get("prop"): field for field in generated_fields if field.get("prop")}
    rename_map: dict[str, str] = {}
    merged_fields: list[dict[str, Any]] = []

    for raw_field in merged.get("fields", []):
        if not isinstance(raw_field, dict):
            continue
        field = dict(raw_field)
        if field.get("entityFieldId") is None:
            matched = generated_by_prop.get(field.get("prop"))
            if matched:
                field["entityFieldId"] = matched.get("entityFieldId")
        generated_field = generated_by_id.get(field.get("entityFieldId"))
        if generated_field:
            if field.get("prop") and field.get("prop") != generated_field.get("prop"):
                rename_map[str(field["prop"])] = str(generated_field["prop"])
            field["label"] = generated_field.get("label")
            field["prop"] = generated_field.get("prop")
            field["type"] = generated_field.get("type")
            field["required"] = generated_field.get("required")
            field["defaultValue"] = generated_field.get("defaultValue")
            field["options"] = generated_field.get("options", [])
            if generated_field.get("relation") is not None:
                field["relation"] = generated_field.get("relation")
        merged_fields.append(field)

    existing_ids = {field.get("entityFieldId") for field in merged_fields if field.get("entityFieldId") is not None}
    existing_props = {field.get("prop") for field in merged_fields if field.get("prop")}
    additions = [
        dict(field)
        for field in generated_fields
        if field.get("entityFieldId") not in existing_ids and field.get("prop") not in existing_props
    ]

    merged["schemaVersion"] = generated.get("schemaVersion", merged.get("schemaVersion"))
    merged["entity"] = generated.get("entity")
    merged["templateKey"] = generated.get("templateKey")
    merged["fields"] = [*merged_fields, *additions]
    apply_field_reference_renames(merged, rename_map)
    return merged


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


def sync_entity_page(db: Session, page_id: str) -> Page | None:
    page = db.query(Page).filter(Page.page_key == page_id).first()
    if not page:
        return None
    if not page.entity_id:
        raise ValueError("page is not bound to an entity")
    entity = db.query(Entity).filter(Entity.id == page.entity_id).first()
    if not entity:
        raise ValueError("bound entity was not found")
    current = json.loads(page.schema_json)
    generated = build_entity_page_schema(db, entity, page.template_key or "standard_crud")
    normalized = normalize_page_schema(page_id, merge_entity_page_schema(current, generated))
    page.schema_json = json.dumps(normalized, ensure_ascii=False)
    page.status = "draft"
    db.add(page)
    create_page_version(db, page, normalized, message="鍚屾瀹炰綋瀛楁")
    db.commit()
    db.refresh(page)
    return page
