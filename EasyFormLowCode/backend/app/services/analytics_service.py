from __future__ import annotations

from datetime import datetime, timezone
import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.entity import EntityRecord


def build_stats_payload(
    db: Session,
    schema_json: dict[str, Any],
    rows: list[dict[str, Any]],
) -> dict[str, Any]:
    fields = schema_json.get("fields") if isinstance(schema_json.get("fields"), list) else []
    return {
        "records": [],
        "total": len(rows),
        "metrics": build_metric_cards(rows, fields, schema_json.get("metrics")),
        "charts": build_chart_cards(db, rows, fields, schema_json.get("charts")),
    }


def build_metric_cards(
    rows: list[dict[str, Any]],
    fields: list[dict[str, Any]],
    metrics: Any,
) -> list[dict[str, Any]]:
    if not isinstance(metrics, list):
        return []
    field_by_prop = {
        str(field.get("prop")): field
        for field in fields
        if isinstance(field, dict) and field.get("prop")
    }
    cards: list[dict[str, Any]] = []
    for metric in metrics:
        if not isinstance(metric, dict):
            continue
        metric_type = str(metric.get("type") or "total")
        field_prop = str(metric.get("field") or "")
        field = field_by_prop.get(field_prop)
        prefix = str(metric.get("prefix") or "")
        suffix = str(metric.get("suffix") or "")
        precision = int(metric.get("precision") or 0)
        value: float | int = len(rows)
        trend = "来自当前数据集" if rows else "暂无数据"

        if metric_type == "match":
            value = sum(1 for row in rows if str(row.get(field_prop, "")) == str(metric.get("value", "")))
            trend = f"{field.get('label') if field else field_prop or '未配置字段'} = {metric.get('value', '')}"
        elif metric_type == "recent":
            days = int(metric.get("recentDays") or 30)
            value = count_recent_records(rows, field_prop, days)
            trend = f"最近 {days} 天" if field else "未配置日期字段"
        elif metric_type == "sum":
            numeric_values = collect_numeric_values(rows, field_prop)
            value = sum(numeric_values)
            trend = f"{field.get('label') if field else field_prop or '未配置字段'} 求和"
        elif metric_type == "average":
            numeric_values = collect_numeric_values(rows, field_prop)
            value = sum(numeric_values) / len(numeric_values) if numeric_values else 0
            trend = f"{field.get('label') if field else field_prop or '未配置字段'} 平均值"
        elif metric_type == "min":
            numeric_values = collect_numeric_values(rows, field_prop)
            value = min(numeric_values) if numeric_values else 0
            trend = f"{field.get('label') if field else field_prop or '未配置字段'} 最小值"
        elif metric_type == "max":
            numeric_values = collect_numeric_values(rows, field_prop)
            value = max(numeric_values) if numeric_values else 0
            trend = f"{field.get('label') if field else field_prop or '未配置字段'} 最大值"
        elif metric_type == "percent":
            matched = sum(1 for row in rows if normalize_number(row.get(field_prop)) == normalize_number(metric.get("value")))
            value = (matched / len(rows)) * 100 if rows else 0
            suffix = suffix or "%"
            trend = f"{field.get('label') if field else field_prop or '未配置字段'} = {metric.get('value', '')}"

        cards.append(
            {
                "id": metric.get("id") or "metric",
                "title": metric.get("title") or "数据统计",
                "type": metric_type,
                "tone": metric.get("tone") or "blue",
                "prefix": prefix,
                "suffix": suffix,
                "precision": precision,
                "value": value,
                "displayValue": format_metric_value(value, prefix, suffix, precision),
                "trend": trend,
            }
        )
    return cards


def build_chart_cards(
    db: Session,
    rows: list[dict[str, Any]],
    fields: list[dict[str, Any]],
    charts: Any,
) -> list[dict[str, Any]]:
    if not isinstance(charts, list):
        return []
    field_by_prop = {
        str(field.get("prop")): field
        for field in fields
        if isinstance(field, dict) and field.get("prop")
    }
    cards: list[dict[str, Any]] = []
    for chart in charts:
        if not isinstance(chart, dict):
            continue
        chart_type = str(chart.get("type") or "pie")
        if chart_type == "metric":
            cards.append(
                {
                    "id": chart.get("id") or "metric",
                    "title": chart.get("title") or "数据统计",
                    "type": "metric",
                    "metric": chart.get("metric") or "count",
                    "value": len(rows),
                    "labels": ["记录数"],
                    "values": [len(rows)],
                    "empty": len(rows) == 0,
                }
            )
            continue

        dimension = str(chart.get("dimension") or "")
        metric = str(chart.get("metric") or "count")
        measure_field = str(chart.get("measureField") or "")
        limit = int(chart.get("limit") or 8)
        sort = str(chart.get("sort") or "desc")
        field = field_by_prop.get(dimension)
        relation_labels = build_relation_label_map(db, field)
        groups: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            raw_value = row.get(dimension)
            label = format_field_value(field, raw_value, relation_labels)
            key = "未填写" if label in ("", None) else str(label)
            groups.setdefault(key, []).append(row)

        option_order = {
            str(option.get("label")): order
            for order, option in enumerate(field.get("options", []) if isinstance(field, dict) and isinstance(field.get("options"), list) else [])
            if isinstance(option, dict) and option.get("label") is not None
        }
        entries = [
            {
                "label": label,
                "value": aggregate_metric_value(items, metric, measure_field),
            }
            for label, items in groups.items()
        ]
        if sort == "asc":
            entries.sort(key=lambda item: (item["label"], option_order.get(item["label"], 10**6)))
        else:
            entries.sort(key=lambda item: (-float(item["value"]), option_order.get(item["label"], 10**6), item["label"]))
        entries = entries[: limit if limit > 0 else 8]
        labels = [item["label"] for item in entries]
        values = [item["value"] for item in entries]
        cards.append(
            {
                "id": chart.get("id") or f"{chart_type}_{dimension or 'records'}",
                "title": chart.get("title") or "数据统计",
                "type": chart_type,
                "dimension": dimension,
                "metric": metric,
                "measureField": measure_field,
                "limit": limit,
                "sort": sort,
                "labels": labels,
                "values": values,
                "empty": len(labels) == 0,
            }
        )
    return cards


def format_field_value(field: dict[str, Any] | None, value: Any, relation_labels: dict[str, str] | None = None) -> Any:
    if field and isinstance(field.get("options"), list):
        if isinstance(value, list):
            return "、".join(str(format_field_value(field, item, relation_labels)) for item in value)
        for option in field["options"]:
            if isinstance(option, dict) and str(option.get("value")) == str(value):
                return option.get("label") or value
    if field and field.get("type") == "switch":
        if value in (True, "true", "enabled", "yes"):
            return field.get("activeText") or "开启"
        if value in (False, "false", "disabled", "no"):
            return field.get("inactiveText") or "关闭"
    if relation_labels and value not in (None, ""):
        return relation_labels.get(str(value), value)
    return value


def build_relation_label_map(db: Session, field: dict[str, Any] | None) -> dict[str, str]:
    relation = field.get("relation") if isinstance(field, dict) else None
    if not isinstance(relation, dict):
        return {}
    target_entity_id = relation.get("entityId")
    display_field = relation.get("displayField")
    if not target_entity_id or not display_field:
        return {}
    records = (
        db.query(EntityRecord)
        .filter(EntityRecord.entity_id == int(target_entity_id))
        .all()
    )
    labels: dict[str, str] = {}
    for record in records:
        data = json.loads(record.data_json)
        value = data.get(display_field, record.id)
        labels[str(record.id)] = str(value if value not in (None, "") else record.id)
    return labels


def count_recent_records(rows: list[dict[str, Any]], prop: str, recent_days: int = 30) -> int:
    if not prop:
        return 0
    now = datetime.now(timezone.utc)
    count = 0
    for row in rows:
        value = row.get(prop)
        if value in (None, ""):
            continue
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            continue
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        if parsed <= now and (now - parsed).days <= recent_days:
            count += 1
    return count


def collect_numeric_values(rows: list[dict[str, Any]], prop: str) -> list[float]:
    values: list[float] = []
    for row in rows:
        number = normalize_number(row.get(prop))
        if number is not None:
            values.append(number)
    return values


def aggregate_metric_value(items: list[dict[str, Any]], metric: str, measure_field: str) -> float | int:
    if metric == "count":
        return len(items)
    values = collect_numeric_values(items, measure_field)
    if not values:
        return 0
    if metric == "sum":
        return sum(values)
    if metric == "average":
        return sum(values) / len(values)
    if metric == "min":
        return min(values)
    if metric == "max":
        return max(values)
    return len(items)


def normalize_number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number


def format_metric_value(value: float | int, prefix: str, suffix: str, precision: int) -> str:
    number = value if isinstance(value, (int, float)) else 0
    return f"{prefix}{number:.{precision}f}{suffix}"
