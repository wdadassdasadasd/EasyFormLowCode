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
    published_version_no: int | None = None
    published_at: str | None = None


class PageSummaryResponse(BaseModel):
    page_id: str
    project_id: int
    name: str
    status: str
    has_published: bool
    updated_at: str
    published_version_no: int | None = None
    published_at: str | None = None


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ProjectUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ProjectResponse(BaseModel):
    id: int
    name: str
    page_count: int
    updated_at: str


class PageCreate(BaseModel):
    page_id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z][A-Za-z0-9_-]*$")
    name: str = Field(min_length=1, max_length=120)


class PageMetadataUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class RuntimeRecordPayload(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)


class BatchDeletePayload(BaseModel):
    record_ids: list[int] = Field(min_length=1, max_length=100)


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


class RuntimeStatsResponse(BaseModel):
    records: list[dict[str, Any]]
    total: int


class PageVersionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    version_no: int
    message: str
    schema_data: dict[str, Any] = Field(alias="schema_json")
    created_at: str
