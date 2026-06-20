from __future__ import annotations

from typing import Any


SCHEMA_VERSION = 1

DEFAULT_PAGE_ACTIONS = {
    "search": True,
    "reset": True,
    "create": True,
    "edit": True,
    "delete": True,
    "batchDelete": True,
}

VALID_DATASOURCE_MODES = {"runtime", "rest"}
FIELD_TYPES = {"input", "textarea", "number", "select", "radio", "date", "switch"}


def build_runtime_datasource(page_id: str) -> dict[str, Any]:
    return {
        "mode": "runtime",
        "listUrl": f"/api/runtime/pages/{page_id}/records",
        "createUrl": f"/api/runtime/pages/{page_id}/records",
        "updateUrl": f"/api/runtime/pages/{page_id}/records/:id",
        "deleteUrl": f"/api/runtime/pages/{page_id}/records/:id",
    }


def get_minimal_schema(page_id: str) -> dict[str, Any]:
    datasource = build_runtime_datasource(page_id)
    return {
        "schemaVersion": SCHEMA_VERSION,
        "id": page_id,
        "title": "用户管理",
        "pageType": "crud",
        "datasource": datasource,
        "api": {**datasource},
        "actions": {**DEFAULT_PAGE_ACTIONS},
        "fields": [],
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


def create_crud_template(page_id: str, name: str) -> dict[str, Any]:
    schema = get_minimal_schema(page_id)
    schema["title"] = name
    schema["fields"] = [
        {
            "id": "field_username",
            "label": "用户名",
            "prop": "username",
            "type": "input",
            "required": True,
            "searchable": True,
            "tableVisible": True,
            "formVisible": True,
            "placeholder": "请输入用户名",
            "defaultValue": "",
            "maxLength": 50,
            "options": [],
        },
        {
            "id": "field_nickname",
            "label": "昵称",
            "prop": "nickname",
            "type": "input",
            "required": False,
            "searchable": True,
            "tableVisible": True,
            "formVisible": True,
            "placeholder": "请输入昵称",
            "defaultValue": "",
            "maxLength": 50,
            "options": [],
        },
        {
            "id": "field_role",
            "label": "用户角色",
            "prop": "role",
            "type": "select",
            "required": False,
            "searchable": True,
            "tableVisible": True,
            "formVisible": True,
            "placeholder": "请选择角色",
            "defaultValue": "",
            "options": [
                {"label": "管理员", "value": "admin"},
                {"label": "普通用户", "value": "user"},
                {"label": "访客", "value": "guest"},
            ],
        },
        {
            "id": "field_status",
            "label": "状态",
            "prop": "status",
            "type": "select",
            "required": False,
            "searchable": True,
            "tableVisible": True,
            "formVisible": True,
            "placeholder": "请选择状态",
            "defaultValue": "enabled",
            "options": [
                {"label": "启用", "value": "enabled"},
                {"label": "停用", "value": "disabled"},
            ],
        },
        {
            "id": "field_created_at",
            "label": "创建时间",
            "prop": "createdAt",
            "type": "date",
            "required": False,
            "searchable": False,
            "tableVisible": True,
            "formVisible": False,
            "placeholder": "",
            "defaultValue": "",
            "options": [],
        },
    ]
    schema["charts"] = [
        {"id": "recordMetric", "type": "metric", "title": "记录总数", "metric": "count"},
        {"id": "statusPie", "type": "pie", "title": "状态分布", "dimension": "status", "metric": "count"},
        {"id": "roleBar", "type": "bar", "title": "角色分布", "dimension": "role", "metric": "count"},
    ]
    return schema


def migrate_page_schema(page_id: str, schema_json: dict[str, Any] | None) -> dict[str, Any]:
    source = dict(schema_json or {}) if isinstance(schema_json, dict) else {}

    if not isinstance(source.get("schemaVersion"), int) or source["schemaVersion"] < SCHEMA_VERSION:
        source["schemaVersion"] = SCHEMA_VERSION

    if not isinstance(source.get("datasource"), dict) and isinstance(source.get("api"), dict):
        source["datasource"] = dict(source["api"])

    if not isinstance(source.get("api"), dict) and isinstance(source.get("datasource"), dict):
        source["api"] = dict(source["datasource"])

    if not isinstance(source.get("actions"), dict):
        source["actions"] = {**DEFAULT_PAGE_ACTIONS}

    if not source.get("id"):
        source["id"] = page_id

    return source


def get_page_schema_validation_errors(schema_json: dict[str, Any] | None) -> list[str]:
    if not isinstance(schema_json, dict):
        return ["schema_json must be an object"]

    errors: list[str] = []
    validators = [
        ("schemaVersion", lambda value: isinstance(value, int), "schemaVersion must be an integer"),
        ("id", lambda value: isinstance(value, str) or value is None, "id must be a string"),
        ("title", lambda value: isinstance(value, str) or value is None, "title must be a string"),
        ("pageType", lambda value: isinstance(value, str) or value is None, "pageType must be a string"),
        ("api", lambda value: isinstance(value, dict) or value is None, "api must be an object"),
        ("datasource", lambda value: isinstance(value, dict) or value is None, "datasource must be an object"),
        ("fields", lambda value: isinstance(value, list) or value is None, "fields must be an array"),
        ("table", lambda value: isinstance(value, dict) or value is None, "table must be an object"),
        ("formDialog", lambda value: isinstance(value, dict) or value is None, "formDialog must be an object"),
        ("charts", lambda value: isinstance(value, list) or value is None, "charts must be an array"),
        ("actions", lambda value: isinstance(value, dict) or value is None, "actions must be an object"),
    ]

    for key, validator, message in validators:
        if not validator(schema_json.get(key)):
            errors.append(message)

    datasource_mode = None
    if isinstance(schema_json.get("datasource"), dict):
        datasource_mode = schema_json["datasource"].get("mode")
    elif isinstance(schema_json.get("api"), dict):
        datasource_mode = schema_json["api"].get("mode")

    if datasource_mode is not None and str(datasource_mode) not in VALID_DATASOURCE_MODES:
        errors.append("datasource.mode must be runtime or rest")

    fields = schema_json.get("fields")
    if isinstance(fields, list):
        ids: set[str] = set()
        props: set[str] = set()
        for index, field in enumerate(fields):
            prefix = f"fields[{index}]"
            if not isinstance(field, dict):
                errors.append(f"{prefix} must be an object")
                continue
            field_id = field.get("id")
            prop = field.get("prop")
            field_type = field.get("type")
            if not isinstance(field_id, str) or not field_id.strip():
                errors.append(f"{prefix}.id is required")
            elif field_id in ids:
                errors.append(f"duplicate field id: {field_id}")
            else:
                ids.add(field_id)
            if not isinstance(prop, str) or not prop.strip():
                errors.append(f"{prefix}.prop is required")
            elif prop in props:
                errors.append(f"duplicate field prop: {prop}")
            else:
                props.add(prop)
            if field_type not in FIELD_TYPES:
                errors.append(f"{prefix}.type is invalid")
            for key in ("searchable", "tableVisible", "formVisible", "required"):
                if key in field and not isinstance(field[key], bool):
                    errors.append(f"{prefix}.{key} must be a boolean")
            options = field.get("options", [])
            if field_type in {"select", "radio"}:
                if not isinstance(options, list):
                    errors.append(f"{prefix}.options must be an array")
                else:
                    values: set[str] = set()
                    for option in options:
                        if not isinstance(option, dict) or not str(option.get("label", "")).strip():
                            errors.append(f"{prefix}.options must include labels")
                            continue
                        value = str(option.get("value", ""))
                        if not value:
                            errors.append(f"{prefix}.options must include values")
                        elif value in values:
                            errors.append(f"{prefix}.options values must be unique")
                        else:
                            values.add(value)

        charts = schema_json.get("charts")
        if isinstance(charts, list):
            for index, chart in enumerate(charts):
                if not isinstance(chart, dict):
                    errors.append(f"charts[{index}] must be an object")
                elif chart.get("type") != "metric" and chart.get("dimension") not in props:
                    errors.append(f"charts[{index}].dimension must reference a field prop")

    return errors


def validate_record_data(schema_json: dict[str, Any], data: dict[str, Any]) -> list[str]:
    fields = schema_json.get("fields") if isinstance(schema_json, dict) else []
    if not isinstance(fields, list) or not fields:
        return []

    form_fields = [field for field in fields if isinstance(field, dict) and field.get("formVisible", True)]
    editable_props = {str(field.get("prop")) for field in form_fields if field.get("prop")}
    errors: list[str] = []
    for prop in data:
        if prop not in editable_props:
            errors.append(f"{prop} is not editable")

    for field in form_fields:
        prop = str(field.get("prop"))
        value = data.get(prop)
        empty = value is None or value == ""
        if field.get("required") and empty:
            errors.append(f"{prop} is required")
            continue
        if empty:
            continue
        if field.get("maxLength") and len(str(value)) > int(field["maxLength"]):
            errors.append(f"{prop} exceeds maxLength")
        if field.get("type") == "number":
            try:
                number = float(value)
                if field.get("min") not in (None, "") and number < float(field["min"]):
                    errors.append(f"{prop} is below min")
                if field.get("max") not in (None, "") and number > float(field["max"]):
                    errors.append(f"{prop} is above max")
            except (TypeError, ValueError):
                errors.append(f"{prop} must be a number")
        if field.get("type") in {"select", "radio"}:
            values = {str(option.get("value")) for option in field.get("options", []) if isinstance(option, dict)}
            if values and str(value) not in values:
                errors.append(f"{prop} has an invalid option")
    return errors


def normalize_page_schema(page_id: str, schema_json: dict[str, Any] | None) -> dict[str, Any]:
    defaults = get_minimal_schema(page_id)
    source = migrate_page_schema(page_id, schema_json)
    datasource = normalize_datasource(page_id, source.get("datasource"), source.get("api"))

    return {
        **defaults,
        **source,
        "schemaVersion": SCHEMA_VERSION,
        "id": str(source.get("id") or page_id),
        "title": str(source.get("title") or defaults["title"]),
        "pageType": str(source.get("pageType") or defaults["pageType"]),
        "datasource": datasource,
        "api": {**datasource},
        "actions": normalize_actions(source.get("actions")),
        "fields": list(source["fields"]) if isinstance(source.get("fields"), list) else [],
        "table": {**defaults["table"], **source.get("table", {})}
        if isinstance(source.get("table"), dict)
        else defaults["table"],
        "formDialog": {**defaults["formDialog"], **source.get("formDialog", {})}
        if isinstance(source.get("formDialog"), dict)
        else defaults["formDialog"],
        "charts": list(source["charts"]) if isinstance(source.get("charts"), list) else [],
    }


def normalize_actions(actions: dict[str, Any] | None) -> dict[str, bool]:
    source = actions if isinstance(actions, dict) else {}
    return {
        key: bool(source[key]) if key in source else default
        for key, default in DEFAULT_PAGE_ACTIONS.items()
    }


def normalize_datasource(
    page_id: str,
    datasource: dict[str, Any] | None,
    legacy_api: dict[str, Any] | None = None,
) -> dict[str, Any]:
    runtime_datasource = build_runtime_datasource(page_id)
    source = datasource if isinstance(datasource, dict) else legacy_api if isinstance(legacy_api, dict) else {}
    mode = str(source.get("mode")) if str(source.get("mode")) in VALID_DATASOURCE_MODES else runtime_datasource["mode"]
    return {
        **runtime_datasource,
        **source,
        "mode": mode,
    }
