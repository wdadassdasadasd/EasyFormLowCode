from sqlalchemy import Engine, inspect, text


def run_database_migrations(engine: Engine) -> None:
    """Apply the small, idempotent SQLite migrations required by the demo app."""
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "pages" not in inspector.get_table_names():
            return

        page_columns = {column["name"] for column in inspector.get_columns("pages")}
        additions = {
            "published_schema_json": "TEXT",
            "project_id": "INTEGER",
            "published_version_id": "INTEGER",
            "published_at": "DATETIME",
            "entity_id": "INTEGER",
            "template_key": "VARCHAR(40)",
            "schema_revision": "INTEGER NOT NULL DEFAULT 1",
        }
        for name, definition in additions.items():
            if name not in page_columns:
                connection.execute(text(f"ALTER TABLE pages ADD COLUMN {name} {definition}"))

        connection.execute(text("UPDATE pages SET schema_revision = 1 WHERE schema_revision IS NULL OR schema_revision < 1"))

        default_project = connection.execute(
            text("SELECT id FROM projects ORDER BY id LIMIT 1"),
        ).scalar()
        if default_project is None:
            result = connection.execute(
                text(
                    "INSERT INTO projects (name, created_at, updated_at) "
                    "VALUES ('演示项目', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                ),
            )
            default_project = result.lastrowid

        connection.execute(
            text("UPDATE pages SET project_id = :project_id WHERE project_id IS NULL"),
            {"project_id": default_project},
        )

        if "page_versions" not in inspector.get_table_names():
            return

        version_inspector = inspect(connection)
        version_indexes = version_inspector.get_indexes("page_versions")
        has_version_index = any(
            index.get("unique") and index.get("column_names") == ["page_id", "version_no"]
            for index in version_indexes
        )
        has_version_constraint = any(
            constraint.get("column_names") == ["page_id", "version_no"]
            for constraint in version_inspector.get_unique_constraints("page_versions")
        )
        if not has_version_index and not has_version_constraint:
            versions = connection.execute(
                text("SELECT id, page_id FROM page_versions ORDER BY page_id, created_at, id"),
            ).mappings().all()
            # Use temporary negative values first so legacy duplicate version numbers can
            # be safely renumbered before the new unique index is created.
            for version in versions:
                connection.execute(
                    text("UPDATE page_versions SET version_no = :version_no WHERE id = :id"),
                    {"version_no": -version["id"], "id": version["id"]},
                )
            next_version_by_page: dict[int, int] = {}
            for version in versions:
                next_version = next_version_by_page.get(version["page_id"], 0) + 1
                next_version_by_page[version["page_id"]] = next_version
                connection.execute(
                    text("UPDATE page_versions SET version_no = :version_no WHERE id = :id"),
                    {"version_no": next_version, "id": version["id"]},
                )
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_page_versions_page_version "
                    "ON page_versions (page_id, version_no)",
                ),
            )
