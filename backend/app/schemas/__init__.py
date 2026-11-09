"""
app/schemas/__init__.py
-----------------------
Exports all schema modules.
"""

from app.schemas import auth  # noqa: F401
from app.schemas import user  # noqa: F401
from app.schemas import attendance  # noqa: F401
from app.schemas import break_  # noqa: F401
from app.schemas import task  # noqa: F401

__all__ = ["auth", "user", "attendance", "break_", "task"]
