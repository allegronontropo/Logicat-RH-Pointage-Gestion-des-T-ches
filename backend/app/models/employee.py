"""
app/models/employee.py
----------------------
SQLAlchemy 2.0 model for the `employees` table.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User


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
    hire_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="employee")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Employee id={self.id} user_id={self.user_id} department={self.department!r}>"
