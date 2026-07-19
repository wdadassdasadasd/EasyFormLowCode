from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PageVersion(Base):
    __tablename__ = "page_versions"
    __table_args__ = (UniqueConstraint("page_id", "version_no", name="uq_page_versions_page_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    page_id: Mapped[int] = mapped_column(ForeignKey("pages.id"), index=True)
    version_no: Mapped[int] = mapped_column(Integer, index=True)
    message: Mapped[str] = mapped_column(String(200), default="保存页面配置")
    schema_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
