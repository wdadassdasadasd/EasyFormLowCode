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
        }
        for name, definition in additions.items():
            if name not in page_columns:
                connection.execute(text(f"ALTER TABLE pages ADD COLUMN {name} {definition}"))

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
