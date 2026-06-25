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
        value = len(rows)
        trend = "来自当前数据集" if rows else "暂无数据"
        if metric_type == "match":
            value = sum(1 for row in rows if str(row.get(field_prop, "")) == str(metric.get("value", "")))
            trend = f"{field.get('label') if field else field_prop or '未配置字段'} = {metric.get('value', '')}"
        elif metric_type == "recent":
            value = count_recent_records(rows, field_prop)
            trend = field.get("label") if field else "未配置日期字段"
        cards.append(
            {
                "id": metric.get("id") or "metric",
                "title": metric.get("title") or "数据统计",
                "type": metric_type,
                "tone": metric.get("tone") or "blue",
                "value": value,
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
        field = field_by_prop.get(dimension)
        relation_labels = build_relation_label_map(db, field)
        groups: dict[str, int] = {}
        for row in rows:
            raw_value = row.get(dimension)
            label = format_field_value(field, raw_value, relation_labels)
            key = "未填写" if label in ("", None) else str(label)
            groups[key] = groups.get(key, 0) + 1
        labels = order_group_labels(field, groups)
        values = [groups[label] for label in labels]
        cards.append(
            {
                "id": chart.get("id") or f"{chart_type}_{dimension or 'records'}",
                "title": chart.get("title") or "数据统计",
                "type": chart_type,
                "dimension": dimension,
                "metric": chart.get("metric") or "count",
                "labels": labels,
                "values": values,
                "empty": len(labels) == 0,
            }
        )
    return cards


def format_field_value(field: dict[str, Any] | None, value: Any, relation_labels: dict[str, str] | None = None) -> Any:
    if field and isinstance(field.get("options"), list):
        for option in field["options"]:
            if isinstance(option, dict) and str(option.get("value")) == str(value):
                return option.get("label") or value
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


def order_group_labels(field: dict[str, Any] | None, groups: dict[str, int]) -> list[str]:
    if not isinstance(field, dict) or not isinstance(field.get("options"), list):
        return list(groups.keys())
    option_labels = [
        str(option.get("label"))
        for option in field["options"]
        if isinstance(option, dict) and option.get("label") is not None
    ]
    ordered = [label for label in option_labels if label in groups]
    remaining = [label for label in groups if label not in ordered]
    return ordered + remaining


def count_recent_records(rows: list[dict[str, Any]], prop: str) -> int:
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
        if (now - parsed).days <= 30:
            count += 1
    return count
