from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api import pages_router, runtime_router, versions_router
from app.database import Base, engine, get_db
from app.models import Page, PageRecord, PageVersion

_ = (Page, PageRecord, PageVersion, get_db)


Base.metadata.create_all(bind=engine)

with engine.begin() as connection:
    columns = {column["name"] for column in inspect(connection).get_columns("pages")}
    if "published_schema_json" not in columns:
        connection.execute(text("ALTER TABLE pages ADD COLUMN published_schema_json TEXT"))

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
app.include_router(runtime_router, prefix="/api")
app.include_router(versions_router, prefix="/api")
