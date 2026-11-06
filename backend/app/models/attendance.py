"""
app/models/attendance.py
------------------------
SQLAlchemy 2.0 model for the `attendances` table.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, Date, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


def _now_utc() -> datetime:
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)


class Attendance(Base):
    __tablename__ = "attendances"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[datetime] = mapped_column(Date, nullable=False)
    check_in: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PRESENT")

    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_employee_date"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Attendance id={self.id} employee_id={self.employee_id} date={self.date!r}>"
