from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import entities_router, pages_router, projects_router, runtime_router, versions_router
from app.database import Base, engine, get_db
from app.models import Entity, EntityField, EntityRecord, EntityRecordRelation, EntityRelation, Page, PageRecord, PageVersion, Project
from app.services.database_migrations import run_database_migrations

_ = (Project, Page, PageRecord, PageVersion, Entity, EntityField, EntityRelation, EntityRecord, EntityRecordRelation, get_db)


Base.metadata.create_all(bind=engine)
run_database_migrations(engine)

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

app.include_router(pages_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(runtime_router, prefix="/api")
app.include_router(versions_router, prefix="/api")
app.include_router(entities_router, prefix="/api")
