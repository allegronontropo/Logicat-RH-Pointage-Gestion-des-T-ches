"""
app/database/session.py
------------------------
SQLAlchemy 2.0 synchronous engine + session factory.

Usage in FastAPI endpoints via dependency injection:

    from app.database.session import get_db
    from sqlalchemy.orm import Session
    from fastapi import Depends

    def my_route(db: Session = Depends(get_db)):
        ...

The engine is configured for PostgreSQL via psycopg (v3).
Connection pool defaults are suitable for a single-process development server.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------
engine = create_engine(
    settings.database_url,
    # Echo SQL statements during development — set to False in production.
    echo=False,
    # Pool settings appropriate for a small single-process app.
    pool_pre_ping=True,  # Verify connections before use to handle server restarts.
    pool_size=5,
    max_overflow=10,
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    class_=Session,
)


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
def get_db() -> Generator[Session, None, None]:
    """
    Yield a SQLAlchemy Session for use in a single request, then close it.

    Guarantees the session is closed even if an exception is raised.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection(db: Session) -> None:
    """
    Execute a trivial query to verify the database connection is alive.

    Raises sqlalchemy.exc.OperationalError if the DB is unreachable.
    Used by the /api/readyz health endpoint.
    """
    db.execute(text("SELECT 1"))
