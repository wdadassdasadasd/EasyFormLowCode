from __future__ import annotations

from typing import Any


SCHEMA_VERSION = 6

DEFAULT_PAGE_ACTIONS = {
    "search": True,
    "reset": True,
    "create": True,
    "edit": True,
    "delete": True,
    "batchDelete": True,
}

VALID_DATASOURCE_MODES = {"runtime", "rest"}
FIELD_TYPES = {
    "input",
    "password",
    "textarea",
    "email",
    "phone",
    "url",
    "number",
    "slider",
    "rate",
    "select",
    "radio",
    "checkbox",
    "cascader",
    "switch",
    "tag",
    "date",
    "datetime",
    "time",
}
VALID_METRIC_TYPES = {"total", "match", "recent", "sum", "average", "min", "max", "percent"}
VALID_CHART_TYPES = {"metric", "pie", "bar", "line", "area", "rankBar"}
VALID_CHART_METRICS = {"count", "sum", "average", "min", "max"}


def build_runtime_datasource(page_id: str) -> dict[str, Any]:
    return {
        "mode": "runtime",
        "listUrl": f"/api/runtime/pages/{page_id}/records",
        "createUrl": f"/api/runtime/pages/{page_id}/records",
        "updateUrl": f"/api/runtime/pages/{page_id}/records/:id",
        "deleteUrl": f"/api/runtime/pages/{page_id}/records/:id",
        "listMethod": "GET",
        "createMethod": "POST",
        "updateMethod": "PUT",
        "deleteMethod": "DELETE",
        "pageParamKey": "page",
        "pageSizeParamKey": "pageSize",
        "requestBodyMode": "wrapped",
        "requestBodyKey": "data",
        "responseItemsKey": "items",
        "responseTotalKey": "total",
        "recordIdKey": "id",
        "errorMessageKey": "detail",
        "successMessageKey": "message",
        "restWriteEnabled": False,
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
        "metrics": [],
        "queries": [],
        "rowActions": [],
        "batchActions": [],
        "entity": None,
        "templateKey": None,
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
            "label": "角色",
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
            "type": "datetime",
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
        {"id": "recordMetric", "type": "metric", "title": "记录总数", "metric": "count", "limit": 8, "sort": "desc"},
        {"id": "statusPie", "type": "pie", "title": "状态分布", "dimension": "status", "metric": "count", "limit": 8, "sort": "desc"},
        {"id": "roleBar", "type": "bar", "title": "角色分布", "dimension": "role", "metric": "count", "limit": 8, "sort": "desc"},
    ]
    schema["metrics"] = [
        {"id": "total", "title": "记录总数", "type": "total", "tone": "blue", "precision": 0, "prefix": "", "suffix": ""},
        {"id": "enabled", "title": "启用记录", "type": "match", "field": "status", "value": "enabled", "tone": "green", "precision": 0},
        {"id": "recent", "title": "近 30 天新增", "type": "recent", "field": "createdAt", "recentDays": 30, "tone": "orange", "precision": 0},
    ]
    return schema


def migrate_page_schema(page_id: str, schema_json: dict[str, Any] | None) -> dict[str, Any]:
    source = dict(schema_json or {}) if isinstance(schema_json, dict) else {}

    version = source.get("schemaVersion") if isinstance(source.get("schemaVersion"), int) else 1
    version = max(version, 1)
    while version < SCHEMA_VERSION:
        if version == 1:
            source["schemaVersion"] = 2
        if version == 2:
            source["metrics"] = source.get("metrics") if isinstance(source.get("metrics"), list) else []
        if version == 3:
            source["entity"] = source.get("entity") if isinstance(source.get("entity"), dict) else None
            source["templateKey"] = source.get("templateKey") if isinstance(source.get("templateKey"), str) else None
        if version == 4:
            source["queries"] = source.get("queries") if isinstance(source.get("queries"), list) else []
            source["rowActions"] = source.get("rowActions") if isinstance(source.get("rowActions"), list) else []
            source["batchActions"] = source.get("batchActions") if isinstance(source.get("batchActions"), list) else []
        if version == 5:
            source["metrics"] = source.get("metrics") if isinstance(source.get("metrics"), list) else []
            source["charts"] = source.get("charts") if isinstance(source.get("charts"), list) else []
        version += 1
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
        ("metrics", lambda value: isinstance(value, list) or value is None, "metrics must be an array"),
        ("queries", lambda value: isinstance(value, list) or value is None, "queries must be an array"),
        ("rowActions", lambda value: isinstance(value, list) or value is None, "rowActions must be an array"),
        ("batchActions", lambda value: isinstance(value, list) or value is None, "batchActions must be an array"),
        ("entity", lambda value: isinstance(value, dict) or value is None, "entity must be an object"),
        ("templateKey", lambda value: isinstance(value, str) or value is None, "templateKey must be a string"),
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
        numeric_props: set[str] = set()
        date_props: set[str] = set()
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
            if field_type in {"number", "slider", "rate"}:
                numeric_props.add(str(prop))
            if field_type in {"date", "datetime", "time"}:
                date_props.add(str(prop))
            for key in ("searchable", "tableVisible", "formVisible", "required"):
                if key in field and not isinstance(field[key], bool):
                    errors.append(f"{prefix}.{key} must be a boolean")
            options = field.get("options", [])
            if field_type in {"select", "radio", "checkbox", "cascader", "tag"}:
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
                validate_chart(errors, chart, index, props, numeric_props)
        metrics = schema_json.get("metrics")
        if isinstance(metrics, list):
            for index, metric in enumerate(metrics):
                validate_metric(errors, metric, index, props, numeric_props, date_props)
        queries = schema_json.get("queries")
        if isinstance(queries, list):
            for index, query in enumerate(queries):
                if not isinstance(query, dict):
                    errors.append(f"queries[{index}] must be an object")
                    continue
                if query.get("fieldProp") not in props:
                    errors.append(f"queries[{index}].fieldProp must reference a field prop")
                if query.get("operator") not in {"contains", "eq"}:
                    errors.append(f"queries[{index}].operator is invalid")
        row_actions = schema_json.get("rowActions")
        if isinstance(row_actions, list):
            for index, action in enumerate(row_actions):
                validate_action(errors, action, f"rowActions[{index}]", {"edit", "delete", "request"})
        batch_actions = schema_json.get("batchActions")
        if isinstance(batch_actions, list):
            for index, action in enumerate(batch_actions):
                validate_action(errors, action, f"batchActions[{index}]", {"batchDelete", "request"})

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
        empty = value is None or value == "" or value == []
        if field.get("required") and empty:
            errors.append(f"{prop} is required")
            continue
        if empty:
            continue
        if field.get("maxLength") and len(str(value)) > int(field["maxLength"]):
            errors.append(f"{prop} exceeds maxLength")
        if field.get("type") in {"number", "slider", "rate"}:
            try:
                number = float(value)
                if field.get("min") not in (None, "") and number < float(field["min"]):
                    errors.append(f"{prop} is below min")
                if field.get("max") not in (None, "") and number > float(field["max"]):
                    errors.append(f"{prop} is above max")
            except (TypeError, ValueError):
                errors.append(f"{prop} must be a number")
        if field.get("type") in {"select", "radio", "tag"}:
            values = {str(option.get("value")) for option in field.get("options", []) if isinstance(option, dict)}
            if values and str(value) not in values and not isinstance(value, list):
                errors.append(f"{prop} has an invalid option")
        if field.get("type") in {"checkbox", "tag"} and isinstance(value, list):
            values = {str(option.get("value")) for option in field.get("options", []) if isinstance(option, dict)}
            invalid = [item for item in value if str(item) not in values]
            if invalid:
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
        "charts": normalize_charts(source.get("charts"), defaults["charts"]),
        "metrics": normalize_metrics(source.get("metrics")),
        "queries": list(source["queries"]) if isinstance(source.get("queries"), list) else [],
        "rowActions": list(source["rowActions"]) if isinstance(source.get("rowActions"), list) else [],
        "batchActions": list(source["batchActions"]) if isinstance(source.get("batchActions"), list) else [],
        "entity": source.get("entity") if isinstance(source.get("entity"), dict) else None,
        "templateKey": source.get("templateKey") if isinstance(source.get("templateKey"), str) else None,
    }


def normalize_actions(actions: dict[str, Any] | None) -> dict[str, bool]:
    source = actions if isinstance(actions, dict) else {}
    return {
        key: bool(source[key]) if key in source else default
        for key, default in DEFAULT_PAGE_ACTIONS.items()
    }


def normalize_int(value: Any, default: int) -> int:
    try:
        return int(value or default)
    except (TypeError, ValueError, OverflowError):
        return default


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
        "requestBodyMode": "plain" if source.get("requestBodyMode") == "plain" else "wrapped",
    }


def normalize_metrics(metrics: Any) -> list[dict[str, Any]]:
    if not isinstance(metrics, list):
        return []
    normalized: list[dict[str, Any]] = []
    for index, metric in enumerate(metrics):
        if not isinstance(metric, dict):
            continue
        normalized.append(
            {
                "id": str(metric.get("id") or f"metric_{index + 1}"),
                "title": str(metric.get("title") or ""),
                "type": metric.get("type") if metric.get("type") in VALID_METRIC_TYPES else "total",
                "field": str(metric.get("field") or ""),
                "value": metric.get("value", ""),
                "recentDays": normalize_int(metric.get("recentDays"), 30),
                "prefix": str(metric.get("prefix") or ""),
                "suffix": str(metric.get("suffix") or ""),
                "precision": normalize_int(metric.get("precision"), 0),
                "tone": str(metric.get("tone") or "blue"),
            }
        )
    return normalized


def normalize_charts(charts: Any, fallback: list[dict[str, Any]]) -> list[dict[str, Any]]:
    source = charts if isinstance(charts, list) and charts else fallback
    normalized: list[dict[str, Any]] = []
    for index, chart in enumerate(source):
        if not isinstance(chart, dict):
            continue
        normalized.append(
            {
                "id": str(chart.get("id") or f"chart_{index + 1}"),
                "title": str(chart.get("title") or ""),
                "type": chart.get("type") if chart.get("type") in VALID_CHART_TYPES else "pie",
                "dimension": str(chart.get("dimension") or ""),
                "metric": chart.get("metric") if chart.get("metric") in VALID_CHART_METRICS else "count",
                "measureField": str(chart.get("measureField") or ""),
                "limit": normalize_int(chart.get("limit"), 8),
                "sort": str(chart.get("sort") or "desc"),
            }
        )
    return normalized


def validate_action(errors: list[str], action: Any, prefix: str, valid_types: set[str]) -> None:
    if not isinstance(action, dict):
        errors.append(f"{prefix} must be an object")
        return
    if action.get("type") not in valid_types:
        errors.append(f"{prefix}.type is invalid")
    if not isinstance(action.get("label"), str) or not action.get("label", "").strip():
        errors.append(f"{prefix}.label is required")
    if action.get("type") == "request" and not str(action.get("url") or "").strip():
        errors.append(f"{prefix}.url is required for request actions")


def validate_metric(errors: list[str], metric: Any, index: int, props: set[str], numeric_props: set[str], date_props: set[str]) -> None:
    if not isinstance(metric, dict):
        errors.append(f"metrics[{index}] must be an object")
        return
    metric_type = metric.get("type")
    field = metric.get("field")
    if metric_type not in VALID_METRIC_TYPES:
        errors.append(f"metrics[{index}].type is invalid")
        return
    if metric_type != "total" and field not in props:
        errors.append(f"metrics[{index}].field must reference a field prop")
    if metric_type in {"sum", "average", "min", "max", "percent"} and field not in numeric_props:
        errors.append(f"metrics[{index}].field must reference a numeric field")
    if metric_type == "recent" and field not in date_props:
        errors.append(f"metrics[{index}].field must reference a date field")
    if metric_type == "percent" and metric.get("value") is None:
        errors.append(f"metrics[{index}].value is required for percent metrics")


def validate_chart(errors: list[str], chart: Any, index: int, props: set[str], numeric_props: set[str]) -> None:
    if not isinstance(chart, dict):
        errors.append(f"charts[{index}] must be an object")
        return
    chart_type = chart.get("type")
    if chart_type not in VALID_CHART_TYPES:
        errors.append(f"charts[{index}].type is invalid")
    if chart_type != "metric" and chart.get("dimension") not in props:
        errors.append(f"charts[{index}].dimension must reference a field prop")
    if chart.get("metric", "count") not in VALID_CHART_METRICS:
        errors.append(f"charts[{index}].metric is invalid")
    if chart.get("metric") in {"sum", "average", "min", "max"} and chart.get("measureField") not in numeric_props:
        errors.append(f"charts[{index}].measureField must reference a numeric field")
