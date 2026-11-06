"""
app/models/task.py
------------------
SQLAlchemy 2.0 model for the `tasks` table.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


def _now_utc() -> datetime:
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="TODO")
    due_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    assigned_to: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(default=_now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=_now_utc, onupdate=_now_utc, nullable=False
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Task id={self.id} title={self.title!r} status={self.status!r}>"
