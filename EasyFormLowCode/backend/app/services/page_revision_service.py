from typing import Any

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models.page import Page


class SchemaRevisionConflictError(RuntimeError):
    def __init__(self, expected_revision: int | None, current_revision: int, required: bool = False):
        self.expected_revision = expected_revision
        self.current_revision = current_revision
        self.required = required
        message = "schema revision is required" if required else "page schema has changed, reload the latest version"
        super().__init__(message)

    def to_detail(self) -> dict[str, int | str | None]:
        return {
            "message": str(self),
            "code": "schema_revision_required" if self.required else "schema_revision_conflict",
            "expected_revision": self.expected_revision,
            "current_revision": self.current_revision,
        }


def require_schema_revision(page: Page, expected_revision: int | None) -> None:
    current_revision = int(page.schema_revision or 1)
    if expected_revision is None:
        raise SchemaRevisionConflictError(None, current_revision, required=True)
    if expected_revision != current_revision:
        raise SchemaRevisionConflictError(expected_revision, current_revision)


def advance_schema_revision(page: Page) -> None:
    page.schema_revision = int(page.schema_revision or 1) + 1


def update_page_with_revision(
    db: Session,
    page: Page,
    expected_revision: int | None,
    values: dict[str, Any],
) -> Page:
    """Atomically apply a schema-affecting page update and advance its revision."""
    require_schema_revision(page, expected_revision)
    current_revision = int(page.schema_revision or 1)
    result = db.execute(
        update(Page)
        .where(Page.id == page.id, Page.schema_revision == current_revision)
        .values(**values, schema_revision=current_revision + 1),
    )
    if result.rowcount != 1:
        db.expire(page)
        db.refresh(page)
        raise SchemaRevisionConflictError(expected_revision, int(page.schema_revision or current_revision))
    db.refresh(page)
    return page
