import sys
import uuid
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Page, PageRecord, PageVersion  # noqa: E402,F401


CONTRACT_FIXTURE = json.loads(
    (BACKEND_ROOT.parent / "test" / "fixtures" / "page-schema-contract.json").read_text(encoding="utf-8"),
)


@pytest.fixture()
def client():
    tmp_dir = BACKEND_ROOT / "tests" / ".tmp"
    tmp_dir.mkdir(exist_ok=True)
    db_path = tmp_dir / f"{uuid.uuid4().hex}.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    engine.dispose()
    db_path.unlink(missing_ok=True)


def test_save_schema_creates_versions_and_restore(client):
    first_schema = {
        "schemaVersion": 1,
        "id": "demo_page",
        "title": "用户管理",
        "pageType": "crud",
        "fields": [
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
            }
        ],
    }
    second_schema = {**first_schema, "title": "客户管理"}

    response = client.put(
        "/api/pages/demo_page/schema",
        json={"name": "用户管理", "schema_json": first_schema},
    )
    assert response.status_code == 200
    assert response.json()["schema_json"]["title"] == "用户管理"
    assert response.json()["schema_json"]["schemaVersion"] == 5

    response = client.put(
        "/api/pages/demo_page/schema",
        json={"name": "客户管理", "schema_json": second_schema},
    )
    assert response.status_code == 200

    versions = client.get("/api/pages/demo_page/versions").json()
    assert [version["version_no"] for version in versions] == [2, 1]

    restore_response = client.post(f"/api/pages/demo_page/versions/{versions[1]['id']}/restore")
    assert restore_response.status_code == 200
    assert restore_response.json()["schema_json"]["title"] == "用户管理"

    versions_after_restore = client.get("/api/pages/demo_page/versions").json()
    assert [version["version_no"] for version in versions_after_restore] == [3, 2, 1]
    assert versions_after_restore[0]["message"] == "恢复到版本 1"


def test_runtime_records_support_crud_search_and_pagination(client):
    records = [
        {"username": "admin", "nickname": "系统管理员"},
        {"username": "zhangsan", "nickname": "张三"},
        {"username": "lisi", "nickname": "李四"},
    ]

    created_ids = []
    for record in records:
        response = client.post("/api/runtime/pages/user_manage/records", json={"data": record})
        assert response.status_code == 200
        created_ids.append(response.json()["id"])

    page_response = client.get("/api/runtime/pages/user_manage/records?page=1&pageSize=2")
    assert page_response.status_code == 200
    assert page_response.json()["total"] == 3
    assert len(page_response.json()["items"]) == 2

    search_response = client.get("/api/runtime/pages/user_manage/records?username=zhang")
    assert search_response.status_code == 200
    assert search_response.json()["total"] == 1
    assert search_response.json()["items"][0]["data"]["nickname"] == "张三"

    update_response = client.put(
        f"/api/runtime/pages/user_manage/records/{created_ids[0]}",
        json={"data": {"username": "root", "nickname": "超级管理员"}},
    )
    assert update_response.status_code == 200
    assert update_response.json()["data"]["username"] == "root"

    delete_response = client.delete(f"/api/runtime/pages/user_manage/records/{created_ids[1]}")
    assert delete_response.status_code == 200

    final_response = client.get("/api/runtime/pages/user_manage/records")
    assert final_response.json()["total"] == 2


def test_publish_uses_snapshot_until_republished(client):
    first_schema = {
        "schemaVersion": 1,
        "id": "publish_page",
        "title": "Published Title",
        "pageType": "crud",
        "fields": [{"id": "field_name", "label": "Name", "prop": "name", "type": "input"}],
    }
    draft_schema = {**first_schema, "title": "Draft Title"}

    save_response = client.put(
        "/api/pages/publish_page/schema",
        json={"name": "Published Title", "schema_json": first_schema},
    )
    assert save_response.status_code == 200

    publish_response = client.post("/api/pages/publish_page/publish")
    assert publish_response.status_code == 200
    assert publish_response.json()["schema_json"]["title"] == "Published Title"
    assert publish_response.json()["published_version_no"] == 1
    assert publish_response.json()["published_at"]

    draft_response = client.put(
        "/api/pages/publish_page/schema",
        json={"name": "Draft Title", "schema_json": draft_schema},
    )
    assert draft_response.status_code == 200
    assert draft_response.json()["status"] == "draft"

    published_response = client.get("/api/pages/publish_page/published")
    assert published_response.status_code == 200
    assert published_response.json()["status"] == "published"
    assert published_response.json()["schema_json"]["title"] == "Published Title"


def test_runtime_stats_use_filtered_records_not_current_page(client):
    for index in range(12):
        status = "enabled" if index % 2 == 0 else "disabled"
        response = client.post(
            "/api/runtime/pages/stats_page/records",
            json={"data": {"username": f"user_{index}", "status": status}},
        )
        assert response.status_code == 200

    page_response = client.get("/api/runtime/pages/stats_page/records?page=1&pageSize=5")
    assert page_response.status_code == 200
    assert len(page_response.json()["items"]) == 5
    assert page_response.json()["total"] == 12

    stats_response = client.get("/api/runtime/pages/stats_page/stats")
    assert stats_response.status_code == 200
    assert stats_response.json()["total"] == 12
    assert stats_response.json()["records"] == []
    assert len(stats_response.json()["metrics"]) == 0
    assert len(stats_response.json()["charts"]) == 0

    filtered_stats = client.get("/api/runtime/pages/stats_page/stats?status=enabled")
    assert filtered_stats.status_code == 200
    assert filtered_stats.json()["total"] == 6


def test_runtime_stats_return_server_side_metrics_and_charts(client):
    schema = {
        "schemaVersion": 4,
        "id": "analytics_page",
        "title": "Analytics",
        "pageType": "crud",
        "fields": [
            {"id": "field_status", "label": "Status", "prop": "status", "type": "select", "options": [{"label": "Enabled", "value": "enabled"}, {"label": "Disabled", "value": "disabled"}]},
            {"id": "field_created_at", "label": "Created At", "prop": "createdAt", "type": "date"},
        ],
        "metrics": [
            {"id": "total", "title": "Total", "type": "total", "tone": "blue"},
            {"id": "enabled", "title": "Enabled", "type": "match", "field": "status", "value": "enabled", "tone": "green"},
        ],
        "charts": [
            {"id": "statusPie", "type": "pie", "title": "Status Pie", "dimension": "status", "metric": "count"},
        ],
    }
    save_response = client.put(
        "/api/pages/analytics_page/schema",
        json={"name": "Analytics", "schema_json": schema},
    )
    assert save_response.status_code == 200
    assert client.post("/api/runtime/pages/analytics_page/records", json={"data": {"status": "enabled", "createdAt": "2026-06-10"}}).status_code == 200
    assert client.post("/api/runtime/pages/analytics_page/records", json={"data": {"status": "disabled", "createdAt": "2026-05-01"}}).status_code == 200

    stats_response = client.get("/api/runtime/pages/analytics_page/stats")
    assert stats_response.status_code == 200
    payload = stats_response.json()
    assert payload["records"] == []
    assert payload["metrics"][0]["value"] == 2
    assert payload["metrics"][1]["value"] == 1
    assert payload["charts"][0]["labels"] == ["Enabled", "Disabled"]
    assert payload["charts"][0]["values"] == [1, 1]


def test_save_schema_rejects_invalid_root_shape(client):
    response = client.put(
        "/api/pages/invalid_page/schema",
        json={
            "name": "Invalid",
            "schema_json": {
                "schemaVersion": 1,
                "id": "invalid_page",
                "title": "Invalid",
                "fields": {},
            },
        },
    )

    assert response.status_code == 422
    assert "fields must be an array" in response.json()["detail"]


def test_runtime_mode_uses_published_schema_snapshot(client):
    published_schema = {
        "schemaVersion": 1,
        "id": "runtime_mode_page",
        "title": "Runtime Mode",
        "pageType": "crud",
        "fields": [{"id": "field_name", "label": "Name", "prop": "name", "type": "input"}],
    }
    draft_schema = {
        **published_schema,
        "fields": [{"id": "field_status", "label": "Status", "prop": "status", "type": "input"}],
    }

    save_response = client.put(
        "/api/pages/runtime_mode_page/schema",
        json={"name": "Runtime Mode", "schema_json": published_schema},
    )
    assert save_response.status_code == 200

    publish_response = client.post("/api/pages/runtime_mode_page/publish")
    assert publish_response.status_code == 200

    record_response = client.post(
        "/api/runtime/pages/runtime_mode_page/records",
        json={"data": {"name": "alpha"}},
    )
    assert record_response.status_code == 200

    update_response = client.put(
        "/api/pages/runtime_mode_page/schema",
        json={"name": "Runtime Mode Draft", "schema_json": draft_schema},
    )
    assert update_response.status_code == 200

    published_status_search = client.get("/api/runtime/pages/runtime_mode_page/records?mode=published&status=enabled")
    assert published_status_search.status_code == 200
    assert published_status_search.json()["total"] == 1

    draft_status_search = client.get("/api/runtime/pages/runtime_mode_page/records?mode=draft&status=enabled")
    assert draft_status_search.status_code == 200
    assert draft_status_search.json()["total"] == 0

    published_name_search = client.get("/api/runtime/pages/runtime_mode_page/records?mode=published&name=alp")
    assert published_name_search.status_code == 200
    assert published_name_search.json()["total"] == 1


def test_runtime_writes_validate_against_requested_schema_mode(client):
    published_schema = {
        "schemaVersion": 1,
        "id": "write_mode_page",
        "title": "Write mode",
        "pageType": "crud",
        "fields": [{"id": "field_published", "label": "Published", "prop": "published", "type": "input", "required": True}],
    }
    draft_schema = {
        **published_schema,
        "fields": [{"id": "field_draft", "label": "Draft", "prop": "draft", "type": "input", "required": True}],
    }

    assert client.put("/api/pages/write_mode_page/schema", json={"name": "Write mode", "schema_json": published_schema}).status_code == 200
    assert client.post("/api/pages/write_mode_page/publish").status_code == 200
    assert client.put("/api/pages/write_mode_page/schema", json={"name": "Write mode", "schema_json": draft_schema}).status_code == 200

    assert client.post("/api/runtime/pages/write_mode_page/records?mode=draft", json={"data": {"draft": "ok"}}).status_code == 200
    assert client.post("/api/runtime/pages/write_mode_page/records", json={"data": {"draft": "not allowed"}}).status_code == 422


def test_project_page_lifecycle_uses_crud_template_and_cascades_data(client):
    project_response = client.post("/api/projects", json={"name": "运营后台"})
    assert project_response.status_code == 201
    project = project_response.json()

    page_response = client.post(
        f"/api/projects/{project['id']}/pages",
        json={"page_id": "customer_manage", "name": "客户管理"},
    )
    assert page_response.status_code == 201
    assert page_response.json()["project_id"] == project["id"]

    schema_response = client.get("/api/pages/customer_manage")
    assert schema_response.status_code == 200
    assert {field["prop"] for field in schema_response.json()["schema_json"]["fields"]} >= {"username", "status"}

    record_response = client.post(
        "/api/runtime/pages/customer_manage/records",
        json={"data": {"username": "customer_a", "status": "enabled"}},
    )
    assert record_response.status_code == 200

    delete_response = client.delete("/api/pages/customer_manage")
    assert delete_response.status_code == 200
    assert client.get(f"/api/projects/{project['id']}/pages").json() == []


def test_runtime_rejects_invalid_record_and_batch_delete_is_atomic(client):
    page_schema = {
        "schemaVersion": 1,
        "id": "validated_page",
        "title": "Validated",
        "pageType": "crud",
        "fields": [
            {
                "id": "field_status",
                "label": "Status",
                "prop": "status",
                "type": "select",
                "required": True,
                "searchable": True,
                "tableVisible": True,
                "formVisible": True,
                "options": [{"label": "Enabled", "value": "enabled"}],
            }
        ],
    }
    assert client.put(
        "/api/pages/validated_page/schema",
        json={"name": "Validated", "schema_json": page_schema},
    ).status_code == 200

    invalid = client.post("/api/runtime/pages/validated_page/records", json={"data": {"status": "disabled"}})
    assert invalid.status_code == 422

    first = client.post("/api/runtime/pages/validated_page/records", json={"data": {"status": "enabled"}}).json()
    second = client.post("/api/runtime/pages/validated_page/records", json={"data": {"status": "enabled"}}).json()
    missing = client.request(
        "DELETE",
        "/api/runtime/pages/validated_page/records",
        json={"record_ids": [first["id"], second["id"] + 999]},
    )
    assert missing.status_code == 404
    assert client.get("/api/runtime/pages/validated_page/records").json()["total"] == 2

    duplicate = client.request(
        "DELETE",
        "/api/runtime/pages/validated_page/records",
        json={"record_ids": [first["id"], first["id"]]},
    )
    assert duplicate.status_code == 422
    assert client.get("/api/runtime/pages/validated_page/records").json()["total"] == 2

    deleted = client.request(
        "DELETE",
        "/api/runtime/pages/validated_page/records",
        json={"record_ids": [first["id"], second["id"]]},
    )
    assert deleted.status_code == 200
    assert deleted.json()["deleted"] == 2


def test_shared_schema_contract_fixture_has_matching_backend_validation(client):
    valid = client.put(
        "/api/pages/contract_page/schema",
        json={"name": "Contract Page", "schema_json": CONTRACT_FIXTURE["validPageSchema"]},
    )
    assert valid.status_code == 200
    invalid = client.put(
        "/api/pages/contract_invalid/schema",
        json={"name": "Invalid", "schema_json": CONTRACT_FIXTURE["invalidPageSchema"]},
    )
    assert invalid.status_code == 422


def test_project_and_page_names_reject_blank_strings(client):
    blank_project = client.post("/api/projects", json={"name": "   "})
    assert blank_project.status_code == 422
    assert blank_project.json()["detail"] == "project name is required"

    project = client.post("/api/projects", json={"name": "Operations"}).json()
    blank_page = client.post(
        f"/api/projects/{project['id']}/pages",
        json={"page_id": "ops_users", "name": "   "},
    )
    assert blank_page.status_code == 422
    assert blank_page.json()["detail"] == "page name is required"
