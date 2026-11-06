"""
app/database/base.py
---------------------
Declarative base for all SQLAlchemy 2.0 ORM models.

Import `Base` in every model file and use it as the parent class:

    from app.database.base import Base

    class User(Base):
        __tablename__ = "users"
        ...

Import all models in alembic/env.py so that Alembic can detect schema changes:

    from app.database.base import Base   # noqa: F401
    from app.models import user, employee, attendance, break_, task  # noqa: F401

    target_metadata = Base.metadata
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass
