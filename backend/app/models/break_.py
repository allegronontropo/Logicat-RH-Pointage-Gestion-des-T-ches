"""
app/models/break_.py
--------------------
SQLAlchemy 2.0 model for the `breaks` table.
Named `break_` to avoid clashing with the Python `break` keyword.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


def _now_utc() -> datetime:
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)


class Break(Base):
    __tablename__ = "breaks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    attendance_id: Mapped[int] = mapped_column(
        ForeignKey("attendances.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # MORNING | LUNCH | EVENING
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("attendance_id", "type", name="uq_attendance_break_type"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Break id={self.id} attendance_id={self.attendance_id} type={self.type!r}>"
