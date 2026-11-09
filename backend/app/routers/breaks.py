"""
app/routers/breaks.py
---------------------
Break endpoints — Employee only.

Endpoints:
  POST   /api/breaks/start          Start a break (body: { type: MORNING|LUNCH|EVENING })
  POST   /api/breaks/{id}/end       End an active break
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_employee, get_db
from app.models.attendance import Attendance
from app.models.break_ import Break
from app.models.employee import Employee
from app.schemas.break_ import BreakStartRequest, BreakResponse
from app.services import attendance_service

router = APIRouter(prefix="/api/breaks", tags=["breaks"])


@router.post(
    "/start",
    response_model=BreakResponse,
    summary="Start a break",
    description="Start a break. Must be checked in, no active break, and type not already used today.",
    status_code=status.HTTP_201_CREATED,
)
def start_break_endpoint(
    break_data: BreakStartRequest,
    db: Annotated[Session, Depends(get_db)],
    current_employee: Annotated[Employee, Depends(get_current_employee)],
) -> BreakResponse:
    break_ = attendance_service.start_break(
        db, current_employee.id, break_data.type
    )
    break_ = (
        db.query(Break)
        .options(joinedload(Break.attendance))
        .filter(Break.id == break_.id)
        .first()
    )
    return BreakResponse.model_validate(break_)


@router.post(
    "/{break_id}/end",
    response_model=BreakResponse,
    summary="End a break",
    description="End an active break. Verifies ownership.",
)
def end_break_endpoint(
    break_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_employee: Annotated[Employee, Depends(get_current_employee)],
) -> BreakResponse:
    break_ = attendance_service.end_break(db, current_employee.id, break_id)
    break_ = (
        db.query(Break)
        .options(joinedload(Break.attendance))
        .filter(Break.id == break_.id)
        .first()
    )
    return BreakResponse.model_validate(break_)
