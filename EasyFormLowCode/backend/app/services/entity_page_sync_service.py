import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.entity import Entity
from app.models.page import Page
from app.services.entity_service import build_entity_page_schema
from app.services.page_version_service import create_page_version
from app.services.page_revision_service import require_schema_revision, update_page_with_revision
from app.services.schema_contract import normalize_page_schema


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


def sync_entity_page(db: Session, page_id: str, expected_revision: int | None = None) -> Page | None:
    page = db.query(Page).filter(Page.page_key == page_id).first()
    if not page:
        return None
    if not page.entity_id:
        raise ValueError("page is not bound to an entity")
    require_schema_revision(page, expected_revision)
    entity = db.query(Entity).filter(Entity.id == page.entity_id).first()
    if not entity:
        raise ValueError("bound entity was not found")
    current = json.loads(page.schema_json)
    generated = build_entity_page_schema(db, entity, page.template_key or "standard_crud")
    normalized = normalize_page_schema(page_id, merge_entity_page_schema(current, generated))
    page = update_page_with_revision(
        db,
        page,
        expected_revision,
        {"schema_json": json.dumps(normalized, ensure_ascii=False), "status": "draft"},
    )
    create_page_version(db, page, normalized, message="实体字段已同步到页面")
    db.commit()
    db.refresh(page)
    return page
