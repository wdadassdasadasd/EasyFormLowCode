from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PageSchemaUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = "用户管理"
    schema_data: dict[str, Any] = Field(default_factory=dict, alias="schema_json")


class PageSchemaResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    page_id: str
    name: str
    status: str
    schema_data: dict[str, Any] = Field(alias="schema_json")


class RuntimeRecordPayload(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)


class RuntimeRecordResponse(BaseModel):
    id: int
    data: dict[str, Any]
    created_at: str
    updated_at: str


class RuntimeRecordListResponse(BaseModel):
    items: list[RuntimeRecordResponse]
    total: int
    page: int
    pageSize: int


class PageVersionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    version_no: int
    message: str
    schema_data: dict[str, Any] = Field(alias="schema_json")
    created_at: str
