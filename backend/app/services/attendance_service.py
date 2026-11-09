"""
app/services/attendance_service.py
----------------------------------
Business logic for attendance, breaks, and absences.

All functions operate within a SQLAlchemy session and raise HTTPException
for business-rule violations. Routers should not contain business logic.
"""

from __future__ import annotations

from datetime import datetime, date, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.break_ import Break
from app.models.employee import Employee


def _today() -> date:
    """Return the current calendar date in UTC."""
    return datetime.now(timezone.utc).date()


def _now_utc() -> datetime:
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Check-in / Check-out
# ---------------------------------------------------------------------------

def check_in(db: Session, employee_id: int) -> Attendance:
    """Create an attendance record for today. Raises 409 if one already exists."""
    today = _today()
    existing = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.date == today,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already checked in today",
        )

    attendance = Attendance(
        employee_id=employee_id,
        date=today,
        check_in=_now_utc(),
        status="PRESENT",
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def check_out(db: Session, employee_id: int) -> Attendance:
    """Check out for today. Raises 409 if not checked in or break is active."""
    today = _today()
    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.date == today,
        )
        .first()
    )
    if not attendance or not attendance.check_in:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Must check in before checking out",
        )

    if attendance.check_out is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already checked out",
        )

    # Block check-out during an active break
    active_break = (
        db.query(Break)
        .filter(
            Break.attendance_id == attendance.id,
            Break.end_time.is_(None),
        )
        .first()
    )
    if active_break:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot check out during an active break",
        )

    attendance.check_out = _now_utc()
    db.commit()
    db.refresh(attendance)
    return attendance


# ---------------------------------------------------------------------------
# Breaks
# ---------------------------------------------------------------------------

def start_break(
    db: Session, employee_id: int, break_type: str
) -> Break:
    """Start a break. Verifies check-in, no active break, and type not already used."""
    today = _today()
    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.date == today,
        )
        .first()
    )
    if not attendance or not attendance.check_in:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Must check in before starting a break",
        )

    # No active break allowed
    active_break = (
        db.query(Break)
        .filter(
            Break.attendance_id == attendance.id,
            Break.end_time.is_(None),
        )
        .first()
    )
    if active_break:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A break is already active",
        )

    # Each break type only once per day
    existing_type = (
        db.query(Break)
        .filter(
            Break.attendance_id == attendance.id,
            Break.type == break_type,
        )
        .first()
    )
    if existing_type:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{break_type} break already taken today",
        )

    break_ = Break(
        attendance_id=attendance.id,
        type=break_type,
        start_time=_now_utc(),
    )
    db.add(break_)
    db.commit()
    db.refresh(break_)
    return break_


def end_break(
    db: Session, employee_id: int, break_id: int
) -> Break:
    """End an active break. Verifies ownership and active state."""
    break_ = db.get(Break, break_id)
    if break_ is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Break not found",
        )

    attendance = db.get(Attendance, break_.attendance_id)
    if attendance is None or attendance.employee_id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Break not found",
        )

    if break_.end_time is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Break already ended",
        )

    break_.end_time = _now_utc()
    db.commit()
    db.refresh(break_)
    return break_


# ---------------------------------------------------------------------------
# Absences
# ---------------------------------------------------------------------------

def declare_absence(
    db: Session,
    employee_id: int,
    absence_date: date,
    status: str,
    justification_note: str | None = None,
) -> Attendance:
    """Declare an absence for an employee on a specific date.

    Raises 409 if an attendance record already exists for that employee/date.
    """
    existing = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.date == absence_date,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance record already exists for this employee/date",
        )

    attendance = Attendance(
        employee_id=employee_id,
        date=absence_date,
        check_in=None,
        check_out=None,
        status=status,
        justification_note=justification_note,
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def justify_absence(
    db: Session,
    attendance_id: int,
    justification_note: str,
) -> Attendance:
    """Update an unjustified absence to justified with a note."""
    attendance = db.get(Attendance, attendance_id)
    if attendance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found",
        )

    attendance.status = "ABSENT_JUSTIFIED"
    attendance.justification_note = justification_note
    db.commit()
    db.refresh(attendance)
    return attendance


# ---------------------------------------------------------------------------
# Duration calculations
# ---------------------------------------------------------------------------

def calculate_durations(
    attendance: Attendance,
) -> tuple[int, int, int]:
    """Return (presence_minutes, break_minutes, effective_minutes).

    Math check: 09:00 to 18:00 = 540 minutes. Breaks 15+60+15 = 90 minutes.
    Effective = 450 minutes (7.5 hours).
    """
    presence_minutes = 0
    break_minutes = 0

    if attendance.check_in and attendance.check_out:
        delta = attendance.check_out - attendance.check_in
        presence_minutes = int(delta.total_seconds() / 60)

    for br in (attendance.breaks or []):
        if br.start_time and br.end_time:
            delta = br.end_time - br.start_time
            break_minutes += int(delta.total_seconds() / 60)

    effective_minutes = presence_minutes - break_minutes
    return presence_minutes, break_minutes, effective_minutes
