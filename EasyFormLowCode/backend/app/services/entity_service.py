import json
import re
from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.entity import Entity, EntityField, EntityRecord, EntityRecordRelation, EntityRelation
from app.models.page import Page
from app.models.project import Project
from app.services.analytics_service import build_stats_payload
from app.services.page_revision_service import update_page_with_revision
from app.services.page_version_service import create_page_version
from app.services.runtime_limits import MAX_IN_MEMORY_SCAN, ensure_scan_limit


ENTITY_FIELD_TYPES = {"text", "textarea", "integer", "number", "boolean", "date", "datetime", "enum", "relation"}
ENTITY_KEY_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")
PAGE_FIELD_TYPE_MAP = {
    "text": "input",
    "textarea": "textarea",
    "integer": "number",
    "number": "number",
    "boolean": "switch",
    "date": "date",
    "datetime": "date",
    "enum": "select",
    "relation": "select",
}


class EntityConflictError(ValueError):
    def __init__(self, detail: str, conflicts: dict[str, Any] | None = None):
        super().__init__(detail)
        self.detail = detail
        self.conflicts = conflicts or {}


def _json(value: str, fallback: Any):
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return fallback


def _key(value: str, label: str) -> str:
    result = str(value or "").strip()
    if not ENTITY_KEY_PATTERN.fullmatch(result):
        raise ValueError(f"{label} must start with a letter and contain only letters, numbers, or underscores")
    return result


def get_entity(db: Session, entity_id: int) -> Entity | None:
    return db.query(Entity).filter(Entity.id == entity_id).first()


def get_entity_relation_by_field(db: Session, field_id: int) -> EntityRelation | None:
    return db.query(EntityRelation).filter(EntityRelation.source_field_id == field_id).first()


def list_project_entities(db: Session, project_id: int) -> list[dict[str, Any]]:
    return [
        entity_to_response(db, entity, include_fields=False)
        for entity in db.query(Entity).filter(Entity.project_id == project_id).order_by(Entity.name).all()
    ]


def entity_to_response(db: Session, entity: Entity, include_fields: bool = True) -> dict[str, Any]:
    result = {
        "id": entity.id,
        "project_id": entity.project_id,
        "entity_key": entity.entity_key,
        "name": entity.name,
        "description": entity.description,
        "created_at": entity.created_at.isoformat(),
        "updated_at": entity.updated_at.isoformat(),
    }
    if include_fields:
        fields = db.query(EntityField).filter(EntityField.entity_id == entity.id).order_by(EntityField.sort_order, EntityField.id).all()
        relations = db.query(EntityRelation).filter(EntityRelation.source_entity_id == entity.id).all()
        relation_by_field = {relation.source_field_id: relation for relation in relations}
        result["fields"] = [field_to_response(field, relation_by_field.get(field.id)) for field in fields]
    return result


def field_to_response(field: EntityField, relation: EntityRelation | None = None) -> dict[str, Any]:
    result = {
        "id": field.id,
        "field_key": field.field_key,
        "label": field.label,
        "field_type": field.field_type,
        "required": field.required,
        "default_value": _json(field.default_value_json, None),
        "options": _json(field.options_json, []),
        "sort_order": field.sort_order,
    }
    if relation:
        result["relation"] = {
            "id": relation.id,
            "target_entity_id": relation.target_entity_id,
            "target_display_field_key": relation.target_display_field_key,
            "relation_type": relation.relation_type,
        }
    return result


def create_entity(db: Session, project_id: int, payload: dict[str, Any]) -> Entity:
    if not db.query(Project).filter(Project.id == project_id).first():
        raise LookupError("project not found")
    entity = Entity(
        project_id=project_id,
        entity_key=_key(payload.get("entity_key"), "entity key"),
        name=str(payload.get("name") or "").strip(),
        description=str(payload.get("description") or "").strip(),
    )
    if not entity.name:
        raise ValueError("entity name is required")
    if db.query(Entity).filter(Entity.project_id == project_id, Entity.entity_key == entity.entity_key).first():
        raise ValueError("entity key already exists in this project")
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def update_entity(db: Session, entity_id: int, payload: dict[str, Any]) -> Entity | None:
    entity = get_entity(db, entity_id)
    if not entity:
        return None
    if "name" in payload:
        entity.name = str(payload["name"] or "").strip()
        if not entity.name:
            raise ValueError("entity name is required")
    if "description" in payload:
        entity.description = str(payload["description"] or "").strip()
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def delete_entity(db: Session, entity_id: int) -> bool:
    entity = get_entity(db, entity_id)
    if not entity:
        return False
    record_count = db.query(EntityRecord).filter(EntityRecord.entity_id == entity_id).count()
    relation_count = db.query(EntityRelation).filter(
        (EntityRelation.source_entity_id == entity_id) | (EntityRelation.target_entity_id == entity_id)
    ).count()
    pages = _collect_entity_pages(db, entity_id)
    if record_count or relation_count or pages:
        raise EntityConflictError(
            "entity cannot be deleted because it is still in use",
            {
                "recordsCount": record_count,
                "relationCount": relation_count,
                "pages": pages,
            },
        )
    db.delete(entity)
    db.commit()
    return True


def create_entity_field(db: Session, entity_id: int, payload: dict[str, Any]) -> EntityField:
    entity = get_entity(db, entity_id)
    if not entity:
        raise LookupError("entity not found")
    field_type = str(payload.get("field_type") or "text")
    if field_type not in ENTITY_FIELD_TYPES:
        raise ValueError("field type is invalid")
    field = EntityField(
        entity_id=entity_id,
        field_key=_key(payload.get("field_key"), "field key"),
        label=str(payload.get("label") or "").strip(),
        field_type=field_type,
        required=bool(payload.get("required", False)),
        default_value_json=json.dumps(payload.get("default_value"), ensure_ascii=False),
        options_json=json.dumps(payload.get("options") or [], ensure_ascii=False),
        sort_order=int(payload.get("sort_order") or 0),
    )
    if not field.label:
        raise ValueError("field label is required")
    if field_type == "enum" and not isinstance(payload.get("options") or [], list):
        raise ValueError("enum field options must be an array")
    if db.query(EntityField).filter(EntityField.entity_id == entity_id, EntityField.field_key == field.field_key).first():
        raise ValueError("field key already exists in this entity")
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


def update_entity_field(db: Session, entity_id: int, field_id: int, payload: dict[str, Any]) -> EntityField | None:
    field = db.query(EntityField).filter(EntityField.id == field_id, EntityField.entity_id == entity_id).first()
    if not field:
        return None

    relation = get_entity_relation_by_field(db, field_id)
    old_key = field.field_key
    old_type = field.field_type

    if "label" in payload:
        field.label = str(payload.get("label") or "").strip()
        if not field.label:
            raise ValueError("field label is required")

    if "field_key" in payload:
        next_key = _key(payload.get("field_key"), "field key")
        duplicate = (
            db.query(EntityField)
            .filter(EntityField.entity_id == entity_id, EntityField.field_key == next_key, EntityField.id != field_id)
            .first()
        )
        if duplicate:
            raise ValueError("field key already exists in this entity")
        field.field_key = next_key

    next_type = str(payload.get("field_type") or field.field_type)
    if next_type not in ENTITY_FIELD_TYPES:
        raise ValueError("field type is invalid")
    if next_type != old_type:
        if not bool(payload.get("confirm_type_change")):
            raise ValueError("field type change requires explicit confirmation")
        if relation and next_type != "relation":
            raise ValueError("relation field type cannot be changed while a relation binding exists")
        if next_type == "relation" and not relation:
            raise ValueError("configure relation metadata before changing this field to relation")
        _ensure_field_type_compatible(db, field, next_type, payload)
        field.field_type = next_type

    if "required" in payload and payload["required"] is not None:
        if bool(payload["required"]) and db.query(EntityRecord).filter(EntityRecord.entity_id == entity_id).count():
            _ensure_field_required_compatible(db, field, relation)
        field.required = bool(payload["required"])

    if "default_value" in payload:
        if next_type == "relation" and payload.get("default_value") not in (None, ""):
            raise ValueError("relation field default value must be empty")
        field.default_value_json = json.dumps(payload.get("default_value"), ensure_ascii=False)

    if "options" in payload:
        options = payload.get("options") or []
        if next_type == "enum" and not isinstance(options, list):
            raise ValueError("enum field options must be an array")
        if next_type == "enum":
            _ensure_enum_options_compatible(db, field, options)
        field.options_json = json.dumps(options, ensure_ascii=False)

    if "sort_order" in payload and payload["sort_order"] is not None:
        field.sort_order = int(payload["sort_order"])

    if "target_display_field_key" in payload and relation:
        display_key = _key(payload.get("target_display_field_key"), "target display field key")
        if not db.query(EntityField).filter(EntityField.entity_id == relation.target_entity_id, EntityField.field_key == display_key).first():
            raise ValueError("target display field not found")
        relation.target_display_field_key = display_key
        db.add(relation)

    db.add(field)
    db.commit()
    db.refresh(field)

    if field.field_key != old_key:
        _sync_renamed_field_references(db, entity_id, field.id, old_key, field.field_key)
    elif field.field_type != old_type or any(
        key in payload for key in {"label", "required", "default_value", "options", "target_display_field_key"}
    ):
        _sync_entity_field_metadata(db, entity_id, field.id)

    return field


def delete_entity_field(db: Session, entity_id: int, field_id: int) -> bool:
    field = db.query(EntityField).filter(EntityField.id == field_id, EntityField.entity_id == entity_id).first()
    if not field:
        return False
    relation_count = db.query(EntityRelation).filter(EntityRelation.source_field_id == field_id).count()
    record_count = db.query(EntityRecord).filter(EntityRecord.entity_id == entity_id).count()
    pages = _collect_entity_pages(db, entity_id, field_id=field_id, field_key=field.field_key)
    if relation_count or record_count or pages:
        raise EntityConflictError(
            "field cannot be deleted because it is still in use",
            {
                "recordsCount": record_count,
                "relationCount": relation_count,
                "pages": pages,
            },
        )
    db.delete(field)
    db.commit()
    return True


def create_entity_relation(db: Session, entity_id: int, payload: dict[str, Any]) -> EntityRelation:
    source = get_entity(db, entity_id)
    target_id = int(payload.get("target_entity_id") or 0)
    target = get_entity(db, target_id)
    field = db.query(EntityField).filter(
        EntityField.id == int(payload.get("source_field_id") or 0),
        EntityField.entity_id == entity_id,
    ).first()
    if not source or not target or not field:
        raise LookupError("source field or target entity not found")
    if source.project_id != target.project_id:
        raise ValueError("relations must stay inside the same project")
    if field.field_type != "relation":
        raise ValueError("relation source field must use the relation type")
    display_key = _key(payload.get("target_display_field_key"), "target display field key")
    if not db.query(EntityField).filter(EntityField.entity_id == target_id, EntityField.field_key == display_key).first():
        raise ValueError("target display field not found")
    if db.query(EntityRelation).filter(EntityRelation.source_field_id == field.id).first():
        raise ValueError("source field already has a relation")
    relation = EntityRelation(
        source_entity_id=entity_id,
        target_entity_id=target_id,
        source_field_id=field.id,
        target_display_field_key=display_key,
    )
    db.add(relation)
    db.commit()
    db.refresh(relation)
    _sync_entity_field_metadata(db, entity_id, field.id)
    return relation


def list_reference_options(db: Session, entity_id: int, relation_field_id: int, search: str = "") -> list[dict[str, Any]]:
    relation = db.query(EntityRelation).filter(
        EntityRelation.source_entity_id == entity_id,
        EntityRelation.source_field_id == relation_field_id,
    ).first()
    if not relation:
        raise LookupError("relation not found")
    rows = (
        db.query(EntityRecord)
        .filter(EntityRecord.entity_id == relation.target_entity_id)
        .order_by(EntityRecord.id.desc())
        .limit(MAX_IN_MEMORY_SCAN + 1)
        .all()
    )
    ensure_scan_limit(len(rows), "reference options")
    needle = search.strip().lower()
    options = []
    for row in rows:
        value = _json(row.data_json, {}).get(relation.target_display_field_key, row.id)
        label = str(value if value not in (None, "") else row.id)
        if not needle or needle in label.lower():
            options.append({"label": label, "value": row.id})
    return options[:100]


def _entity_fields(db: Session, entity_id: int) -> tuple[list[EntityField], dict[int, EntityRelation]]:
    fields = db.query(EntityField).filter(EntityField.entity_id == entity_id).order_by(EntityField.sort_order, EntityField.id).all()
    relations = db.query(EntityRelation).filter(EntityRelation.source_entity_id == entity_id).all()
    return fields, {relation.source_field_id: relation for relation in relations}


def _record_field_value(db: Session, record: EntityRecord, field: EntityField, relation: EntityRelation | None) -> Any:
    if relation:
        item = db.query(EntityRecordRelation).filter(
            EntityRecordRelation.relation_id == relation.id,
            EntityRecordRelation.source_record_id == record.id,
        ).first()
        return item.target_record_id if item else None
    return _json(record.data_json, {}).get(field.field_key)


def _ensure_field_required_compatible(db: Session, field: EntityField, relation: EntityRelation | None) -> None:
    for record in db.query(EntityRecord).filter(EntityRecord.entity_id == field.entity_id).all():
        if _record_field_value(db, record, field, relation) in (None, ""):
            raise ValueError(f"{field.field_key} cannot be required because existing records are empty")


def _ensure_enum_options_compatible(db: Session, field: EntityField, options: list[dict[str, Any]]) -> None:
    allowed = {str(option.get("value")) for option in options if isinstance(option, dict) and option.get("value") not in (None, "")}
    if not allowed:
        return
    for record in db.query(EntityRecord).filter(EntityRecord.entity_id == field.entity_id).all():
        value = _json(record.data_json, {}).get(field.field_key)
        if value not in (None, "") and str(value) not in allowed:
            raise ValueError(f"{field.field_key} has existing values outside the new options")


def _build_compatibility_field(field: EntityField, next_type: str, payload: dict[str, Any]) -> EntityField:
    compatible = EntityField(
        entity_id=field.entity_id,
        field_key=field.field_key,
        label=field.label,
        field_type=next_type,
        required=bool(payload.get("required", field.required)),
        default_value_json=json.dumps(
            payload.get("default_value") if "default_value" in payload else _json(field.default_value_json, None),
            ensure_ascii=False,
        ),
        options_json=json.dumps(
            payload.get("options") if "options" in payload else _json(field.options_json, []),
            ensure_ascii=False,
        ),
        sort_order=field.sort_order,
    )
    compatible.id = field.id
    return compatible


def _ensure_field_type_compatible(db: Session, field: EntityField, next_type: str, payload: dict[str, Any]) -> None:
    relation = get_entity_relation_by_field(db, field.id)
    compatible = _build_compatibility_field(field, next_type, payload)
    for record in db.query(EntityRecord).filter(EntityRecord.entity_id == field.entity_id).all():
        _validate_value(compatible, _record_field_value(db, record, field, relation))


def _validate_value(field: EntityField, value: Any) -> Any:
    if value in (None, ""):
        if field.required:
            raise ValueError(f"{field.field_key} is required")
        return _json(field.default_value_json, None) if value is None else value
    if field.field_type == "integer":
        if isinstance(value, bool):
            raise ValueError(f"{field.field_key} must be an integer")
        try:
            return int(value)
        except (TypeError, ValueError) as error:
            raise ValueError(f"{field.field_key} must be an integer") from error
    if field.field_type == "number":
        try:
            return float(value)
        except (TypeError, ValueError) as error:
            raise ValueError(f"{field.field_key} must be a number") from error
    if field.field_type == "boolean":
        if not isinstance(value, bool):
            raise ValueError(f"{field.field_key} must be a boolean")
    if field.field_type in {"date", "datetime"}:
        try:
            date.fromisoformat(str(value).replace("Z", "+00:00")) if field.field_type == "date" else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError as error:
            raise ValueError(f"{field.field_key} has an invalid date value") from error
    if field.field_type == "enum":
        values = {str(option.get("value")) for option in _json(field.options_json, []) if isinstance(option, dict)}
        if values and str(value) not in values:
            raise ValueError(f"{field.field_key} has an invalid option")
    return value


def _apply_record_data(db: Session, record: EntityRecord, data: dict[str, Any]) -> None:
    fields, relation_by_field = _entity_fields(db, record.entity_id)
    known = {field.field_key for field in fields}
    unknown = set(data) - known
    if unknown:
        raise ValueError(f"unknown fields: {', '.join(sorted(unknown))}")
    plain: dict[str, Any] = {}
    relation_values: list[tuple[EntityRelation, int | None]] = []
    for field in fields:
        value = data.get(field.field_key)
        relation = relation_by_field.get(field.id)
        if relation:
            if value in (None, ""):
                if field.required:
                    raise ValueError(f"{field.field_key} is required")
                relation_values.append((relation, None))
            else:
                target = db.query(EntityRecord).filter(
                    EntityRecord.id == int(value),
                    EntityRecord.entity_id == relation.target_entity_id,
                ).first()
                if not target:
                    raise ValueError(f"{field.field_key} references a missing record")
                relation_values.append((relation, target.id))
        else:
            plain[field.field_key] = _validate_value(field, value)
    record.data_json = json.dumps(plain, ensure_ascii=False)
    db.add(record)
    db.flush()
    db.query(EntityRecordRelation).filter(EntityRecordRelation.source_record_id == record.id).delete(synchronize_session=False)
    for relation, target_id in relation_values:
        if target_id is not None:
            db.add(
                EntityRecordRelation(
                    relation_id=relation.id,
                    source_record_id=record.id,
                    target_record_id=target_id,
                )
            )


def _entity_records_to_responses(db: Session, records: list[EntityRecord]) -> list[dict[str, Any]]:
    if not records:
        return []
    fields, relation_by_field = _entity_fields(db, records[0].entity_id)
    record_ids = [record.id for record in records]
    relation_rows = (
        db.query(EntityRecordRelation)
        .filter(EntityRecordRelation.source_record_id.in_(record_ids))
        .all()
    )
    targets_by_record = {
        record_id: {
            item.relation_id: item.target_record_id
            for item in relation_rows
            if item.source_record_id == record_id
        }
        for record_id in record_ids
    }
    responses = []
    for record in records:
        data = dict(_json(record.data_json, {}))
        for field in fields:
            relation = relation_by_field.get(field.id)
            if relation:
                data[field.field_key] = targets_by_record[record.id].get(relation.id)
        responses.append(
            {
                "id": record.id,
                "data": data,
                "created_at": record.created_at.isoformat(),
                "updated_at": record.updated_at.isoformat(),
            },
        )
    return responses


def entity_record_to_response(db: Session, record: EntityRecord) -> dict[str, Any]:
    return _entity_records_to_responses(db, [record])[0]


def create_entity_record(db: Session, entity_id: int, data: dict[str, Any]) -> EntityRecord:
    if not get_entity(db, entity_id):
        raise LookupError("entity not found")
    record = EntityRecord(entity_id=entity_id)
    db.add(record)
    _apply_record_data(db, record, data)
    db.commit()
    db.refresh(record)
    return record


def update_entity_record(db: Session, entity_id: int, record_id: int, data: dict[str, Any]) -> EntityRecord | None:
    record = db.query(EntityRecord).filter(EntityRecord.entity_id == entity_id, EntityRecord.id == record_id).first()
    if not record:
        return None
    _apply_record_data(db, record, data)
    db.commit()
    db.refresh(record)
    return record


def list_entity_records(db: Session, entity_id: int, filters: dict[str, str], page: int, page_size: int) -> dict[str, Any]:
    if not get_entity(db, entity_id):
        raise LookupError("entity not found")
    query = db.query(EntityRecord).filter(EntityRecord.entity_id == entity_id).order_by(EntityRecord.id.desc())
    active_filters = {key: str(value).lower() for key, value in filters.items() if value not in (None, "")}
    if active_filters:
        records = query.limit(MAX_IN_MEMORY_SCAN + 1).all()
        ensure_scan_limit(len(records), "record filtering")
        items = _entity_records_to_responses(db, records)
        items = [item for item in items if all(value in str(item["data"].get(key, "")).lower() for key, value in active_filters.items())]
        total = len(items)
    else:
        total = query.count()
        safe_size = max(1, min(int(page_size), 100))
        safe_page = max(1, min(int(page), max(1, (total + safe_size - 1) // safe_size)))
        records = query.offset((safe_page - 1) * safe_size).limit(safe_size).all()
        return {"items": _entity_records_to_responses(db, records), "total": total, "page": safe_page, "pageSize": safe_size}
    safe_size = max(1, min(int(page_size), 100))
    safe_page = max(1, min(int(page), max(1, (total + safe_size - 1) // safe_size)))
    start = (safe_page - 1) * safe_size
    return {"items": items[start:start + safe_size], "total": total, "page": safe_page, "pageSize": safe_size}


def list_entity_record_stats(
    db: Session,
    entity_id: int,
    filters: dict[str, str],
    schema_json: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not get_entity(db, entity_id):
        raise LookupError("entity not found")
    records = (
        db.query(EntityRecord)
        .filter(EntityRecord.entity_id == entity_id)
        .order_by(EntityRecord.id.desc())
        .limit(MAX_IN_MEMORY_SCAN + 1)
        .all()
    )
    ensure_scan_limit(len(records), "record statistics")
    rows = _entity_records_to_responses(db, records)
    active_filters = {key: str(value).lower() for key, value in filters.items() if value not in (None, "")}
    if active_filters:
        rows = [row for row in rows if all(value in str(row["data"].get(key, "")).lower() for key, value in active_filters.items())]
    plain_rows = [{"id": row["id"], **row["data"]} for row in rows]
    if isinstance(schema_json, dict):
        return build_stats_payload(db, schema_json, plain_rows)
    return {"records": plain_rows, "total": len(plain_rows), "metrics": [], "charts": []}


def delete_entity_record(db: Session, entity_id: int, record_id: int) -> bool:
    record = db.query(EntityRecord).filter(EntityRecord.entity_id == entity_id, EntityRecord.id == record_id).first()
    if not record:
        return False
    if db.query(EntityRecordRelation).filter(EntityRecordRelation.target_record_id == record_id).first():
        raise ValueError("record is still referenced by another entity")
    db.query(EntityRecordRelation).filter(EntityRecordRelation.source_record_id == record_id).delete(synchronize_session=False)
    db.delete(record)
    db.commit()
    return True


def delete_entity_records(db: Session, entity_id: int, record_ids: list[int]) -> int:
    ids = sorted(set(record_ids))
    if len(ids) != len(record_ids):
        raise ValueError("record ids must be unique")
    records = db.query(EntityRecord).filter(EntityRecord.entity_id == entity_id, EntityRecord.id.in_(ids)).all()
    if len(records) != len(ids):
        raise ValueError("one or more records were not found")
    if db.query(EntityRecordRelation).filter(EntityRecordRelation.target_record_id.in_(ids)).first():
        raise ValueError("one or more records are still referenced by another entity")
    db.query(EntityRecordRelation).filter(EntityRecordRelation.source_record_id.in_(ids)).delete(synchronize_session=False)
    for record in records:
        db.delete(record)
    db.commit()
    return len(records)


def build_entity_page_schema(db: Session, entity: Entity, template_key: str) -> dict[str, Any]:
    fields, relation_by_field = _entity_fields(db, entity.id)
    page_fields = []
    for field in fields:
        relation = relation_by_field.get(field.id)
        page_field = {
            "id": f"entity_field_{field.id}",
            "label": field.label,
            "prop": field.field_key,
            "type": PAGE_FIELD_TYPE_MAP[field.field_type],
            "entityFieldId": field.id,
            "required": field.required,
            "searchable": field.field_type != "textarea",
            "tableVisible": True,
            "formVisible": True,
            "defaultValue": _json(field.default_value_json, ""),
            "options": _json(field.options_json, []),
        }
        if relation:
            page_field["relation"] = {
                "entityId": relation.target_entity_id,
                "fieldId": field.id,
                "displayField": relation.target_display_field_key,
            }
        page_fields.append(page_field)
    schema = {
        "schemaVersion": 6,
        "id": entity.entity_key,
        "title": entity.name,
        "pageType": "crud",
        "entity": {"id": entity.id, "key": entity.entity_key},
        "templateKey": template_key,
        "datasource": {"mode": "runtime"},
        "api": {"mode": "runtime"},
        "actions": {"search": True, "reset": True, "create": True, "edit": True, "delete": True, "batchDelete": True},
        "fields": page_fields,
        "table": {"rowKey": "id", "columns": [], "actions": ["edit", "delete"]},
        "formDialog": {"title": f"缂栬緫{entity.name}", "width": "680px"},
        "metrics": [],
        "charts": [],
        "queries": [],
        "rowActions": [],
        "batchActions": [],
    }
    if template_key == "operations_dashboard":
        schema["metrics"] = [{"id": "total", "title": f"{entity.name}鎬绘暟", "type": "total", "tone": "blue"}]
        dimension = next(
            (field.field_key for field in fields if field.field_type in {"enum", "boolean", "relation"}),
            fields[0].field_key if fields else "",
        )
        if dimension:
            schema["charts"] = [{"id": "distribution", "type": "pie", "title": f"{entity.name}鍒嗗竷", "dimension": dimension, "metric": "count"}]
    return schema


def _collect_entity_pages(db: Session, entity_id: int, field_id: int | None = None, field_key: str | None = None) -> list[dict[str, Any]]:
    pages = db.query(Page).filter(Page.entity_id == entity_id).order_by(Page.updated_at.desc()).all()
    if field_id is None and field_key is None:
        return [{"pageId": page.page_key, "name": page.name} for page in pages]
    matches: list[dict[str, Any]] = []
    for page in pages:
        if _schema_references_field(_json(page.schema_json, {}), field_id, field_key):
            matches.append({"pageId": page.page_key, "name": page.name})
    return matches


def _schema_references_field(schema: dict[str, Any], field_id: int | None, field_key: str | None) -> bool:
    for item in schema.get("fields", []):
        if not isinstance(item, dict):
            continue
        if field_id is not None and item.get("entityFieldId") == field_id:
            return True
        if field_key and item.get("prop") == field_key:
            return True
    for item in schema.get("metrics", []):
        if isinstance(item, dict) and field_key and item.get("field") == field_key:
            return True
    for item in schema.get("charts", []):
        if isinstance(item, dict) and field_key and item.get("dimension") == field_key:
            return True
    for item in schema.get("queries", []):
        if isinstance(item, dict) and field_key and item.get("fieldProp") == field_key:
            return True
    return False


def _sync_renamed_field_references(db: Session, entity_id: int, field_id: int, old_key: str, new_key: str) -> None:
    pages = db.query(Page).filter(Page.entity_id == entity_id).all()
    for page in pages:
        changed = False
        draft_schema = _json(page.schema_json, {})
        updates = {}
        if _rewrite_schema_field_references(draft_schema, field_id, old_key, new_key):
            updates["schema_json"] = json.dumps(draft_schema, ensure_ascii=False)
            changed = True
        if page.published_schema_json:
            published_schema = _json(page.published_schema_json, {})
            if _rewrite_schema_field_references(published_schema, field_id, old_key, new_key):
                updates["published_schema_json"] = json.dumps(published_schema, ensure_ascii=False)
                changed = True
        if changed:
            page = update_page_with_revision(db, page, page.schema_revision, updates)
            create_page_version(db, page, _json(page.schema_json, {}), message="实体字段引用已同步")
    db.commit()


def _sync_entity_field_metadata(db: Session, entity_id: int, field_id: int) -> None:
    pages = db.query(Page).filter(Page.entity_id == entity_id).all()
    for page in pages:
        changed = False
        draft_schema = _json(page.schema_json, {})
        updates = {}
        if _refresh_schema_field_metadata(db, draft_schema, field_id):
            updates["schema_json"] = json.dumps(draft_schema, ensure_ascii=False)
            changed = True
        if page.published_schema_json:
            published_schema = _json(page.published_schema_json, {})
            if _refresh_schema_field_metadata(db, published_schema, field_id):
                updates["published_schema_json"] = json.dumps(published_schema, ensure_ascii=False)
                changed = True
        if changed:
            page = update_page_with_revision(db, page, page.schema_revision, updates)
            create_page_version(db, page, _json(page.schema_json, {}), message="实体字段元数据已同步")
    db.commit()


def _rewrite_schema_field_references(schema: dict[str, Any], field_id: int, old_key: str, new_key: str) -> bool:
    changed = False
    for item in schema.get("fields", []):
        if isinstance(item, dict) and (item.get("entityFieldId") == field_id or item.get("prop") == old_key):
            if item.get("prop") != new_key:
                item["prop"] = new_key
                changed = True
    for item in schema.get("metrics", []):
        if isinstance(item, dict) and item.get("field") == old_key:
            item["field"] = new_key
            changed = True
    for item in schema.get("charts", []):
        if isinstance(item, dict) and item.get("dimension") == old_key:
            item["dimension"] = new_key
            changed = True
    for item in schema.get("queries", []):
        if isinstance(item, dict) and item.get("fieldProp") == old_key:
            item["fieldProp"] = new_key
            changed = True
    return changed


def _refresh_schema_field_metadata(db: Session, schema: dict[str, Any], field_id: int) -> bool:
    if not isinstance(schema, dict):
        return False
    field = db.query(EntityField).filter(EntityField.id == field_id).first()
    if not field:
        return False
    relation = get_entity_relation_by_field(db, field_id)
    changed = False
    for item in schema.get("fields", []):
        if not isinstance(item, dict):
            continue
        if item.get("entityFieldId") not in (field_id, None):
            continue
        if item.get("entityFieldId") is None and item.get("prop") != field.field_key:
            continue
        next_values = {
            "entityFieldId": field.id,
            "label": field.label,
            "prop": field.field_key,
            "type": PAGE_FIELD_TYPE_MAP[field.field_type],
            "required": field.required,
            "defaultValue": _json(field.default_value_json, ""),
            "options": _json(field.options_json, []),
        }
        if relation:
            next_values["relation"] = {
                "entityId": relation.target_entity_id,
                "fieldId": field.id,
                "displayField": relation.target_display_field_key,
            }
        for key, value in next_values.items():
            if item.get(key) != value:
                item[key] = value
                changed = True
    return changed
