import sys
import uuid
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


@pytest.fixture()
def client():
    tmp_dir = BACKEND_ROOT / "tests" / ".tmp"
    tmp_dir.mkdir(exist_ok=True)
    db_path = tmp_dir / f"{uuid.uuid4().hex}.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
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
