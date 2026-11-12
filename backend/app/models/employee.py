"""
app/models/employee.py
----------------------
SQLAlchemy 2.0 model for the `employees` table.
"""

from __future__ import annotations

from datetime import datetime, date, time, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Date, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.attendance import Attendance
    from app.models.task import Task


def _now_utc() -> datetime:
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    position: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expected_start_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(9, 0))
    expected_end_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(18, 0))

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="employee")
    attendances: Mapped[list["Attendance"]] = relationship(back_populates="employee")
    tasks: Mapped[list["Task"]] = relationship(back_populates="employee")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Employee id={self.id} user_id={self.user_id} department={self.department!r}>"
