from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Entity(Base):
    __tablename__ = "entities"
    __table_args__ = (UniqueConstraint("project_id", "entity_key", name="uq_entities_project_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    entity_key: Mapped[str] = mapped_column(String(80), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class EntityField(Base):
    __tablename__ = "entity_fields"
    __table_args__ = (UniqueConstraint("entity_id", "field_key", name="uq_entity_fields_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id"), index=True)
    field_key: Mapped[str] = mapped_column(String(80))
    label: Mapped[str] = mapped_column(String(120))
    field_type: Mapped[str] = mapped_column(String(32))
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    default_value_json: Mapped[str] = mapped_column(Text, default="null")
    options_json: Mapped[str] = mapped_column(Text, default="[]")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class EntityRelation(Base):
    __tablename__ = "entity_relations"
    __table_args__ = (UniqueConstraint("source_field_id", name="uq_entity_relations_source_field"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id"), index=True)
    target_entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id"), index=True)
    source_field_id: Mapped[int] = mapped_column(ForeignKey("entity_fields.id"), index=True)
    target_display_field_key: Mapped[str] = mapped_column(String(80))
    relation_type: Mapped[str] = mapped_column(String(32), default="many_to_one")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class EntityRecord(Base):
    __tablename__ = "entity_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id"), index=True)
    data_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class EntityRecordRelation(Base):
    __tablename__ = "entity_record_relations"
    __table_args__ = (UniqueConstraint("relation_id", "source_record_id", name="uq_record_relation_source"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    relation_id: Mapped[int] = mapped_column(ForeignKey("entity_relations.id"), index=True)
    source_record_id: Mapped[int] = mapped_column(ForeignKey("entity_records.id"), index=True)
    target_record_id: Mapped[int] = mapped_column(ForeignKey("entity_records.id"), index=True)
