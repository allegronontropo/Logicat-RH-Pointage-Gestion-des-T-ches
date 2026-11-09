"""
app/main.py
-----------
FastAPI application entry point.

Registers:
  - CORS middleware
  - Health endpoints: GET /api/healthz, GET /api/readyz
  - All API routers (auth, users, employees, attendances, breaks, tasks, dashboard)

Run locally:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import check_db_connection, get_db
from app.routers import auth as auth_router
from app.routers import users as users_router
from app.routers import employees as employees_router
from app.routers import attendances as attendances_router
from app.routers import breaks as breaks_router
from app.routers import tasks as tasks_router
from app.routers import dashboard as dashboard_router

# ---------------------------------------------------------------------------
# Application instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="LOGICAT RH API",
    version="0.3.0",
    description=(
        "HR management API — attendance tracking and task management. "
        "Two roles: ADMIN_RH and EMPLOYEE. "
        "See /docs for the full OpenAPI specification."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(employees_router.router)
app.include_router(attendances_router.router)
app.include_router(breaks_router.router)
app.include_router(tasks_router.router)
app.include_router(dashboard_router.router)

# ---------------------------------------------------------------------------
# Health endpoints
# ---------------------------------------------------------------------------


@app.get(
    "/api/healthz",
    tags=["health"],
    summary="Liveness probe",
    description="Returns 200 as long as the FastAPI process is running.",
)
def healthz() -> dict[str, str]:
    """Liveness check — no external dependencies."""
    return {"status": "ok"}


@app.get(
    "/api/readyz",
    tags=["health"],
    summary="Readiness probe",
    description="Returns 200 when FastAPI can reach the PostgreSQL database.",
)
def readyz(db: Session = Depends(get_db)) -> dict[str, str]:
    """
    Readiness check — verifies the database connection is live.

    Raises HTTP 500 (via unhandled OperationalError) if the DB is unreachable.
    """
    check_db_connection(db)
    return {"status": "ready"}
