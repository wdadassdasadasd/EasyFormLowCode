from typing import Any

from pydantic import BaseModel, Field


class EntityCreate(BaseModel):
    entity_key: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=300)


class EntityUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=300)


class EntityFieldCreate(BaseModel):
    field_key: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    field_type: str
    required: bool = False
    default_value: Any = None
    options: list[dict[str, Any]] = Field(default_factory=list)
    sort_order: int = 0


class EntityFieldUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=120)
    field_key: str | None = Field(default=None, min_length=1, max_length=80)
    field_type: str | None = None
    required: bool | None = None
    default_value: Any = None
    options: list[dict[str, Any]] | None = None
    sort_order: int | None = None
    target_display_field_key: str | None = Field(default=None, min_length=1, max_length=80)
    confirm_type_change: bool = False


class EntityRelationCreate(BaseModel):
    source_field_id: int
    target_entity_id: int
    target_display_field_key: str


class EntityRecordPayload(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)
