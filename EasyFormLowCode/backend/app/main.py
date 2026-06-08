from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.schemas.page_schema import (
    PageSchemaResponse,
    PageSchemaUpdate,
    PageVersionResponse,
    RuntimeRecordListResponse,
    RuntimeRecordPayload,
    RuntimeRecordResponse,
)
from app.services.page_service import (
    create_page_record,
    delete_page_record,
    get_page_version,
    get_or_create_page,
    list_page_records,
    list_page_versions,
    page_to_response,
    publish_page,
    record_to_response,
    restore_page_version,
    save_page_schema,
    update_page_record,
    version_to_response,
)
from app.models import Page, PageRecord, PageVersion

_ = (Page, PageRecord, PageVersion)


Base.metadata.create_all(bind=engine)

app = FastAPI(title="LowCode Admin Builder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/pages/{page_id}", response_model=PageSchemaResponse)
def get_page(page_id: str, db: Session = Depends(get_db)):
    page = get_or_create_page(db, page_id)
    return page_to_response(page)


@app.put("/api/pages/{page_id}/schema", response_model=PageSchemaResponse)
def update_page_schema(
    page_id: str,
    payload: PageSchemaUpdate,
    db: Session = Depends(get_db),
):
    page = save_page_schema(db, page_id, payload.name, payload.schema_data)
    return page_to_response(page)


@app.post("/api/pages/{page_id}/publish", response_model=PageSchemaResponse)
def publish_page_schema(page_id: str, db: Session = Depends(get_db)):
    page = publish_page(db, page_id)
    return page_to_response(page)


@app.get(
    "/api/runtime/pages/{page_id}/records",
    response_model=RuntimeRecordListResponse,
)
def get_runtime_records(
    page_id: str,
    request: Request,
    page: int = 1,
    pageSize: int = 10,
    db: Session = Depends(get_db),
):
    filters = {
        key: value
        for key, value in request.query_params.items()
        if key not in {"page", "pageSize"}
    }
    return list_page_records(db, page_id, filters, page, pageSize)


@app.post(
    "/api/runtime/pages/{page_id}/records",
    response_model=RuntimeRecordResponse,
)
def create_runtime_record(
    page_id: str,
    payload: RuntimeRecordPayload,
    db: Session = Depends(get_db),
):
    record = create_page_record(db, page_id, payload.data)
    return record_to_response(record)


@app.put(
    "/api/runtime/pages/{page_id}/records/{record_id}",
    response_model=RuntimeRecordResponse,
)
def update_runtime_record(
    page_id: str,
    record_id: int,
    payload: RuntimeRecordPayload,
    db: Session = Depends(get_db),
):
    record = update_page_record(db, page_id, record_id, payload.data)

    if not record:
        raise HTTPException(status_code=404, detail="record not found")

    return record_to_response(record)


@app.delete("/api/runtime/pages/{page_id}/records/{record_id}")
def delete_runtime_record(
    page_id: str,
    record_id: int,
    db: Session = Depends(get_db),
):
    deleted = delete_page_record(db, page_id, record_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="record not found")

    return {"ok": True}


@app.get(
    "/api/pages/{page_id}/versions",
    response_model=list[PageVersionResponse],
)
def get_page_versions(page_id: str, db: Session = Depends(get_db)):
    return list_page_versions(db, page_id)


@app.get(
    "/api/pages/{page_id}/versions/{version_id}",
    response_model=PageVersionResponse,
)
def get_page_version_detail(
    page_id: str,
    version_id: int,
    db: Session = Depends(get_db),
):
    version = get_page_version(db, page_id, version_id)

    if not version:
        raise HTTPException(status_code=404, detail="version not found")

    return version_to_response(version)


@app.post(
    "/api/pages/{page_id}/versions/{version_id}/restore",
    response_model=PageSchemaResponse,
)
def restore_page_version_schema(
    page_id: str,
    version_id: int,
    db: Session = Depends(get_db),
):
    page = restore_page_version(db, page_id, version_id)

    if not page:
        raise HTTPException(status_code=404, detail="version not found")

    return page_to_response(page)
