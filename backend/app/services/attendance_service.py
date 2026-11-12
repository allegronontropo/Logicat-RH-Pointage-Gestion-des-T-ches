"""
app/services/attendance_service.py
----------------------------------
Business logic for attendance, breaks, and absences.

All functions operate within a SQLAlchemy session and raise HTTPException
for business-rule violations. Routers should not contain business logic.
"""

from __future__ import annotations

import logging
from datetime import datetime, date, time, timezone, timedelta

from fastapi import HTTPException, status as http_status
status = http_status
from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.break_ import Break
from app.models.employee import Employee

logger = logging.getLogger(__name__)


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
    start_date: date,
    end_date: date,
    status: str,
    justification_note: str | None = None,
    override: bool = False,
) -> list[Attendance]:
    """Declare an absence for an employee across a date range [start_date, end_date].

    Loops day-by-day from start_date to end_date (inclusive).
    For each day, creates or updates the Attendance record with the given status.
    If an existing record is PRESENT and override is False, skips it and logs a warning
    to prevent crashes or unwanted overwrites.
    """
    if end_date < start_date:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before or equal to end_date",
        )

    records: list[Attendance] = []
    current_date = start_date
    while current_date <= end_date:
        existing = (
            db.query(Attendance)
            .filter(
                Attendance.employee_id == employee_id,
                Attendance.date == current_date,
            )
            .first()
        )
        if existing:
            if existing.status == "PRESENT" and not override:
                logger.warning(
                    "Skipping absence declaration on %s for employee %s: employee already recorded PRESENT",
                    current_date,
                    employee_id,
                )
            else:
                existing.status = status
                existing.justification_note = justification_note
                db.commit()
                db.refresh(existing)
                records.append(existing)
        else:
            attendance = Attendance(
                employee_id=employee_id,
                date=current_date,
                check_in=None,
                check_out=None,
                status=status,
                justification_note=justification_note,
            )
            db.add(attendance)
            db.commit()
            db.refresh(attendance)
            records.append(attendance)

        current_date += timedelta(days=1)

    return records


def override_status(
    db: Session,
    attendance_id: int,
    new_status: str,
    justification_note: str | None = None,
) -> Attendance:
    """Override an attendance record's status (e.g. PRESENT -> ABSENT_JUSTIFIED for early leave)."""
    attendance = db.get(Attendance, attendance_id)
    if attendance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found",
        )
    attendance.status = new_status
    if justification_note is not None:
        attendance.justification_note = justification_note
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
    """Return (presence_minutes, break_minutes, effective_minutes), including live time.

    Math check: 09:00 to 18:00 = 540 minutes. Breaks 15+60+15 = 90 minutes.
    Effective = 450 minutes (7.5 hours).
    """
    if not attendance.check_in:
        return 0, 0, 0

    now = datetime.now(timezone.utc)

    employee = attendance.employee
    expected_start = employee.expected_start_time if employee and employee.expected_start_time else time(9, 0)
    expected_end = employee.expected_end_time if employee and employee.expected_end_time else time(18, 0)

    def as_utc(value: datetime) -> datetime:
        # Some database drivers return naive values for timezone-aware columns;
        # treat those stored timestamps as UTC before subtracting.
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    check_in = as_utc(attendance.check_in)
    schedule_date = check_in.date()
    expected_start_dt = datetime.combine(schedule_date, expected_start, tzinfo=timezone.utc)
    expected_end_dt = datetime.combine(schedule_date, expected_end, tzinfo=timezone.utc)
    presence_start = max(check_in, expected_start_dt)
    presence_end = min(as_utc(attendance.check_out) if attendance.check_out else now, expected_end_dt)
    presence_minutes = (
        int((presence_end - presence_start).total_seconds() / 60)
        if presence_end > presence_start
        else 0
    )
    break_minutes = 0

    for br in (attendance.breaks or []):
        if br.start_time:
            break_end = min(as_utc(br.end_time) if br.end_time else now, expected_end_dt)
            duration = int((as_utc(break_end) - as_utc(br.start_time)).total_seconds() / 60)
            break_minutes += max(0, duration)

    effective_minutes = max(0, presence_minutes - break_minutes)
    return presence_minutes, break_minutes, effective_minutes
