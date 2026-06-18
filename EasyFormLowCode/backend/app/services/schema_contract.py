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
