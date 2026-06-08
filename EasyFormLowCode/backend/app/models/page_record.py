from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PageRecord(Base):
    __tablename__ = "page_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    page_id: Mapped[int] = mapped_column(ForeignKey("pages.id"), index=True)
    data_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
