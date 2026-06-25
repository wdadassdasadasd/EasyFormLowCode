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
from app.models import Entity, EntityField, EntityRecord, EntityRecordRelation, EntityRelation, Page, PageRecord, PageVersion, Project  # noqa: E402,F401


@pytest.fixture()
def client():
    db_path = BACKEND_ROOT / "tests" / f"{uuid.uuid4().hex}.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = session_local()
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


def create_project(client):
    return client.post("/api/projects", json={"name": "Operations"}).json()


def create_entity(client, project_id, key, name):
    response = client.post(f"/api/projects/{project_id}/entities", json={"entity_key": key, "name": name})
    assert response.status_code == 201
    return response.json()


def create_field(client, entity_id, key, label, field_type="text", required=False):
    response = client.post(f"/api/entities/{entity_id}/fields", json={"field_key": key, "label": label, "field_type": field_type, "required": required})
    assert response.status_code == 201
    return response.json()


def test_entity_relation_generates_runtime_page_and_enforces_reference_integrity(client):
    project = create_project(client)
    supplier = create_entity(client, project["id"], "supplier", "Supplier")
    supplier_name = create_field(client, supplier["id"], "name", "Name", required=True)
    order = create_entity(client, project["id"], "purchase_order", "Purchase order")
    create_field(client, order["id"], "order_no", "Order number", required=True)
    supplier_field = create_field(client, order["id"], "supplier_id", "Supplier", "relation", required=True)

    relation = client.post(f"/api/entities/{order['id']}/relations", json={"source_field_id": supplier_field["id"], "target_entity_id": supplier["id"], "target_display_field_key": supplier_name["field_key"]})
    assert relation.status_code == 201

    supplier_record = client.post(f"/api/entities/{supplier['id']}/records", json={"data": {"name": "Acme"}}).json()
    options = client.get(f"/api/entities/{order['id']}/fields/{supplier_field['id']}/reference-options")
    assert options.json() == [{"label": "Acme", "value": supplier_record["id"]}]

    generated = client.post(f"/api/projects/{project['id']}/pages", json={"page_id": "orders", "name": "Orders", "entity_id": order["id"], "template_key": "operations_dashboard"})
    assert generated.status_code == 201
    assert generated.json()["entity_id"] == order["id"]

    create_field(client, order["id"], "note", "Note")
    synced = client.post("/api/pages/orders/sync-entity")
    assert synced.status_code == 200
    assert {field["prop"] for field in synced.json()["schema_json"]["fields"]} >= {"order_no", "supplier_id", "note"}

    invalid = client.post("/api/runtime/pages/orders/records", json={"data": {"order_no": "PO-1", "supplier_id": 999}})
    assert invalid.status_code == 422
    created = client.post("/api/runtime/pages/orders/records", json={"data": {"order_no": "PO-1", "supplier_id": supplier_record["id"]}})
    assert created.status_code == 200
    assert created.json()["data"]["supplier_id"] == supplier_record["id"]

    referenced = client.delete(f"/api/entities/{supplier['id']}/records/{supplier_record['id']}")
    assert referenced.status_code == 409

    runtime = client.get("/api/runtime/pages/orders/records")
    assert runtime.status_code == 200
    assert runtime.json()["total"] == 1

    stats = client.get("/api/runtime/pages/orders/stats")
    assert stats.status_code == 200
    assert stats.json()["records"] == []
    assert stats.json()["metrics"][0]["value"] == 1
    assert stats.json()["charts"][0]["labels"] == ["Acme"]


def test_patch_field_renames_bound_page_references_and_delete_conflicts_are_structured(client):
    project = create_project(client)
    entity = create_entity(client, project["id"], "customer", "Customer")
    name_field = create_field(client, entity["id"], "name", "Name", required=True)

    generated = client.post(
        f"/api/projects/{project['id']}/pages",
        json={"page_id": "customers", "name": "Customers", "entity_id": entity["id"], "template_key": "operations_dashboard"},
    )
    assert generated.status_code == 201

    page = client.get("/api/pages/customers")
    assert page.status_code == 200
    schema = page.json()["schema_json"]
    schema["queries"] = [{
        "id": "query_name",
        "label": "Name",
        "fieldProp": "name",
        "paramKey": "name",
        "operator": "contains",
        "defaultValue": "",
    }]
    save = client.put("/api/pages/customers/schema", json={"name": "Customers", "schema_json": schema})
    assert save.status_code == 200

    renamed = client.patch(
        f"/api/entities/{entity['id']}/fields/{name_field['id']}",
        json={"field_key": "customer_name", "label": "Customer name"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["field_key"] == "customer_name"

    page = client.get("/api/pages/customers")
    assert page.status_code == 200
    current_schema = page.json()["schema_json"]
    assert current_schema["fields"][0]["prop"] == "customer_name"
    assert current_schema["queries"][0]["fieldProp"] == "customer_name"

    conflict = client.delete(f"/api/entities/{entity['id']}")
    assert conflict.status_code == 409
    assert conflict.json()["detail"] == "entity cannot be deleted because it is still in use"
    assert conflict.json()["conflicts"]["pages"][0]["pageId"] == "customers"
