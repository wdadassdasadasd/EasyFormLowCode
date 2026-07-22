import sys
import uuid
import json
from datetime import datetime, timedelta, timezone
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
from app.services.analytics_service import count_recent_records  # noqa: E402
from app.services.runtime_limits import MAX_IN_MEMORY_SCAN, ensure_scan_limit  # noqa: E402


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
    assert response.json()["schema_json"]["schemaVersion"] == 6

    response = client.put(
        "/api/pages/demo_page/schema",
        json={"name": "客户管理", "schema_json": second_schema, "expected_revision": response.json()["schema_revision"]},
    )
    assert response.status_code == 200

    versions = client.get("/api/pages/demo_page/versions").json()
    assert [version["version_no"] for version in versions] == [2, 1]

    restore_response = client.post(
        f"/api/pages/demo_page/versions/{versions[1]['id']}/restore",
        json={"expected_revision": response.json()["schema_revision"]},
    )
    assert restore_response.status_code == 200
    assert restore_response.json()["schema_json"]["title"] == "用户管理"

    versions_after_restore = client.get("/api/pages/demo_page/versions").json()
    assert [version["version_no"] for version in versions_after_restore] == [3, 2, 1]
    assert versions_after_restore[0]["message"] == "恢复到版本 1"


def test_default_version_and_publish_messages_are_chinese_not_mojibake(client):
    # Regression: service defaults used to be GBK-mojibake bytes written into
    # UTF-8 source, making Page.name/PageVersion.message display as 闰岗...
    # Ensure defaults round-trip as readable Chinese.
    schema = {
        "schemaVersion": 1,
        "id": "default_msg_page",
        "title": "默认消息页",
        "pageType": "crud",
        "fields": [],
    }
    saved = client.put("/api/pages/default_msg_page/schema", json={"name": "", "schema_json": schema})
    assert saved.status_code == 200
    # When name is empty, save_page_schema falls back to schema title.
    assert saved.json()["name"] == "默认消息页"

    versions = client.get("/api/pages/default_msg_page/versions").json()
    assert versions, "save should create a default version"
    assert versions[0]["message"] == "保存页面配置"

    published = client.post(
        "/api/pages/default_msg_page/publish",
        json={"expected_revision": saved.json()["schema_revision"]},
    )
    assert published.status_code == 200
    versions_after_publish = client.get("/api/pages/default_msg_page/versions").json()
    assert any(version["message"] == "保存页面配置" for version in versions_after_publish)


def test_publish_creates_initial_version_with_publish_message_for_page_without_versions(client):
    # Cover the branch where publish_page falls back to create_page_version with
    # the default publish message. Trigger the implicit "user_manage" page via
    # GET /api/pages (which calls get_or_create_page) so the page has zero
    # versions; publishing then stamps the publish default message.
    listing = client.get("/api/pages")
    assert listing.status_code == 200
    assert any(page["page_id"] == "user_manage" for page in listing.json())

    published = client.post(
        "/api/pages/user_manage/publish",
        json={"expected_revision": 1},
    )
    assert published.status_code == 200
    versions = client.get("/api/pages/user_manage/versions").json()
    assert versions, "publish should create an initial version when none exists"
    assert versions[0]["message"] == "发布页面配置"


def test_unknown_page_reads_return_not_found_without_creating_a_page(client):
    assert client.get("/api/pages/missing_page").status_code == 404
    assert client.get("/api/pages/missing_page/published").status_code == 404
    assert client.get("/api/pages/missing_page/versions").status_code == 404
    assert client.get("/api/runtime/pages/missing_page/records").status_code == 404
    assert client.get("/api/runtime/pages/missing_page/stats").status_code == 404
    assert client.get("/api/pages").json()[0]["page_id"] == "user_manage"


def test_schema_save_keeps_legacy_first_write_page_creation(client):
    response = client.put(
        "/api/pages/created_by_schema/schema",
        json={
            "name": "Created",
            "schema_json": {"schemaVersion": 1, "id": "created_by_schema", "title": "Created", "pageType": "crud", "fields": []},
        },
    )
    assert response.status_code == 200
    assert client.get("/api/pages/created_by_schema").status_code == 200


def test_schema_revision_prevents_lost_updates_and_publish_does_not_advance_revision(client):
    schema = {"schemaVersion": 1, "id": "revision_page", "title": "Revision", "pageType": "crud", "fields": []}
    created = client.put("/api/pages/revision_page/schema", json={"name": "Revision", "schema_json": schema})
    assert created.status_code == 200
    assert created.json()["schema_revision"] == 1

    saved = client.put(
        "/api/pages/revision_page/schema",
        json={"name": "Revision v2", "schema_json": {**schema, "title": "Revision v2"}, "expected_revision": 1},
    )
    assert saved.status_code == 200
    assert saved.json()["schema_revision"] == 2

    conflict = client.put(
        "/api/pages/revision_page/schema",
        json={"name": "Stale", "schema_json": {**schema, "title": "Stale"}, "expected_revision": 1},
    )
    assert conflict.status_code == 409
    assert conflict.json()["detail"] == {
        "message": "page schema has changed, reload the latest version",
        "code": "schema_revision_conflict",
        "expected_revision": 1,
        "current_revision": 2,
    }

    published = client.post("/api/pages/revision_page/publish", json={"expected_revision": 2})
    assert published.status_code == 200
    assert published.json()["schema_revision"] == 2


def test_project_page_template_is_atomic_and_creates_one_initial_version(client):
    project = client.post("/api/projects", json={"name": "Template project"}).json()
    invalid = client.post(
        f"/api/projects/{project['id']}/pages",
        json={"page_id": "bad_template", "name": "Bad", "template_schema": {"fields": {}}},
    )
    assert invalid.status_code == 422
    assert client.get(f"/api/projects/{project['id']}/pages").json() == []

    created = client.post(
        f"/api/projects/{project['id']}/pages",
        json={"page_id": "template_page", "name": "Template", "template_schema": {"queries": []}},
    )
    assert created.status_code == 201
    assert len(client.get(f"/api/projects/{project['id']}/pages").json()) == 1
    assert len(client.get("/api/pages/template_page/versions").json()) == 1


def test_runtime_scan_limit_has_a_readable_boundary():
    ensure_scan_limit(MAX_IN_MEMORY_SCAN, "record statistics")
    with pytest.raises(ValueError, match="record statistics supports at most 1000 records"):
        ensure_scan_limit(MAX_IN_MEMORY_SCAN + 1, "record statistics")


def test_runtime_records_support_crud_search_and_pagination(client):
    assert client.get("/api/pages").status_code == 200
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

    publish_response = client.post("/api/pages/publish_page/publish", json={"expected_revision": save_response.json()["schema_revision"]})
    assert publish_response.status_code == 200
    assert publish_response.json()["schema_json"]["title"] == "Published Title"
    assert publish_response.json()["published_version_no"] == 1
    assert publish_response.json()["published_at"]

    draft_response = client.put(
        "/api/pages/publish_page/schema",
        json={"name": "Draft Title", "schema_json": draft_schema, "expected_revision": publish_response.json()["schema_revision"]},
    )
    assert draft_response.status_code == 200
    assert draft_response.json()["status"] == "draft"

    published_response = client.get("/api/pages/publish_page/published")
    assert published_response.status_code == 200
    assert published_response.json()["status"] == "published"
    assert published_response.json()["schema_json"]["title"] == "Published Title"


def test_runtime_stats_use_filtered_records_not_current_page(client):
    assert client.put(
        "/api/pages/stats_page/schema",
        json={
            "name": "Stats",
            "schema_json": {"schemaVersion": 1, "id": "stats_page", "title": "Stats", "pageType": "crud", "fields": []},
        },
    ).status_code == 200
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

    publish_response = client.post("/api/pages/runtime_mode_page/publish", json={"expected_revision": save_response.json()["schema_revision"]})
    assert publish_response.status_code == 200

    record_response = client.post(
        "/api/runtime/pages/runtime_mode_page/records",
        json={"data": {"name": "alpha"}},
    )
    assert record_response.status_code == 200

    update_response = client.put(
        "/api/pages/runtime_mode_page/schema",
        json={"name": "Runtime Mode Draft", "schema_json": draft_schema, "expected_revision": publish_response.json()["schema_revision"]},
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
    first = client.get("/api/pages/write_mode_page").json()
    assert client.post("/api/pages/write_mode_page/publish", json={"expected_revision": first["schema_revision"]}).status_code == 200
    assert client.put("/api/pages/write_mode_page/schema", json={"name": "Write mode", "schema_json": draft_schema, "expected_revision": first["schema_revision"]}).status_code == 200

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


def test_schema_contract_default_and_normalize_endpoints(client):
    default_response = client.get("/api/schema-contract/page-schema/default?page_id=orders")
    assert default_response.status_code == 200
    default_schema = default_response.json()["schema_json"]
    assert default_schema["id"] == "orders"
    assert default_schema["schemaVersion"] == 6
    assert default_schema["datasource"]["listUrl"] == "/runtime/pages/orders/records"

    normalize_response = client.post(
        "/api/schema-contract/page-schema/normalize",
        json={
            "page_id": "orders",
            "schema_json": {
                "schemaVersion": 1,
                "title": "Orders",
                "datasource": {"mode": "runtime"},
                "fields": [],
            },
        },
    )
    assert normalize_response.status_code == 200
    normalized_schema = normalize_response.json()["schema_json"]
    assert normalized_schema["id"] == "orders"
    assert normalized_schema["schemaVersion"] == 6
    assert normalized_schema["api"] == normalized_schema["datasource"]


def test_schema_contract_normalize_defaults_invalid_numeric_analytics_settings(client):
    normalize_response = client.post(
        "/api/schema-contract/page-schema/normalize",
        json={
            "page_id": "analytics_defaults",
            "schema_json": {
                "schemaVersion": 6,
                "title": "Analytics Defaults",
                "fields": [],
                "metrics": [
                    {"id": "recent", "type": "recent", "recentDays": "invalid", "precision": "invalid"},
                ],
                "charts": [
                    {"id": "statusPie", "type": "pie", "limit": "invalid"},
                ],
            },
        },
    )

    assert normalize_response.status_code == 200
    normalized_schema = normalize_response.json()["schema_json"]
    assert normalized_schema["metrics"][0]["recentDays"] == 30
    assert normalized_schema["metrics"][0]["precision"] == 0
    assert normalized_schema["charts"][0]["limit"] == 8


def test_schema_contract_validate_endpoint_reports_stable_errors(client):
    valid = client.post(
        "/api/schema-contract/page-schema/validate",
        json={"page_id": "contract_page", "schema_json": CONTRACT_FIXTURE["validPageSchema"]},
    )
    assert valid.status_code == 200
    assert valid.json()["valid"] is True
    assert valid.json()["errors"] == []
    assert valid.json()["schema_json"]["schemaVersion"] == 6

    invalid = client.post(
        "/api/schema-contract/page-schema/validate",
        json={"page_id": "contract_invalid", "schema_json": CONTRACT_FIXTURE["invalidPageSchema"]},
    )
    assert invalid.status_code == 200
    payload = invalid.json()
    assert payload["valid"] is False
    assert "duplicate field id: duplicate" in payload["errors"]
    assert "duplicate field prop: name" in payload["errors"]
    assert "fields[1].type is invalid" in payload["errors"]


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


def test_count_recent_records_ignores_future_dates():
    rows = [
        {"createdAt": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
        {"createdAt": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()},
        {"createdAt": (datetime.now(timezone.utc) - timedelta(days=40)).isoformat()},
        {"createdAt": "not-a-date"},
    ]

    assert count_recent_records(rows, "createdAt", 30) == 1
