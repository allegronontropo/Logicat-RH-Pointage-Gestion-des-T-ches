"""
tests/conftest.py
-----------------
Pytest configuration and fixtures for the LOGICAT RH auth test suite.

Uses a SQLite in-memory database (shared via StaticPool) so tests run fast
without requiring PostgreSQL. `Base.metadata.create_all()` is called here in
the test setup only — the application itself relies on Alembic for schema
management.

The FastAPI `get_db` dependency is overridden to yield a test session bound
to the SQLite engine.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the backend directory is on sys.path so `app.*` imports resolve.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.database.session import get_db
from app.main import app


# ---------------------------------------------------------------------------
# Test database engine (SQLite in-memory, shared across sessions)
# ---------------------------------------------------------------------------

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Create all tables once at module import (test setup only).
Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Dependency override
# ---------------------------------------------------------------------------

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    """Provide a FastAPI TestClient with the test DB override active."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def db_session():
    """Provide a SQLAlchemy session bound to the test database."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def clean_db():
    """Drop and recreate all tables before every test for isolation."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
