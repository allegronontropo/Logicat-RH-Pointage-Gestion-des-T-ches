"""
app/models/__init__
-------------------
Exports the declarative Base and all ORM models.

Importing this package ensures every model is registered with
`Base.metadata`, which Alembic uses for autogeneration.
"""

from app.database.base import Base

from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.break_ import Break
from app.models.task import Task

__all__ = [
    "Base",
    "User",
    "Employee",
    "Attendance",
    "Break",
    "Task",
]
