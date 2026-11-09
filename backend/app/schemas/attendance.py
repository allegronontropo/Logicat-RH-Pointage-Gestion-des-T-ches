"""
app/schemas/attendance.py
-------------------------
Pydantic schemas for attendance and absences.
"""

from __future__ import annotations

from datetime import datetime, date
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.models.break_ import Break


class BreakSummary(BaseModel):
    """Nested break summary inside AttendanceResponse."""

    id: int
    type: str
    start_time: datetime
    end_time: datetime | None = None

    model_config = {"from_attributes": True}


class AttendanceResponse(BaseModel):
    """Response body for attendance endpoints, including computed durations."""

    id: int
    employee_id: int
    date: date
    check_in: datetime | None = None
    check_out: datetime | None = None
    status: str
    justification_note: str | None = None
    presence_minutes: int = 0
    break_minutes: int = 0
    effective_minutes: int = 0
    breaks: list[BreakSummary] = []

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_durations(
        cls, attendance: "Attendance"
    ) -> "AttendanceResponse":
        from app.services.attendance_service import calculate_durations

        presence_minutes, break_minutes, effective_minutes = calculate_durations(
            attendance
        )
        return cls(
            id=attendance.id,
            employee_id=attendance.employee_id,
            date=attendance.date,
            check_in=attendance.check_in,
            check_out=attendance.check_out,
            status=attendance.status,
            justification_note=attendance.justification_note,
            presence_minutes=presence_minutes,
            break_minutes=break_minutes,
            effective_minutes=effective_minutes,
            breaks=[
                BreakSummary(
                    id=b.id,
                    type=b.type,
                    start_time=b.start_time,
                    end_time=b.end_time,
                )
                for b in (attendance.breaks or [])
            ],
        )


class AbsenceCreate(BaseModel):
    """Request body for POST /api/attendances/absences (admin declares absence)."""

    employee_id: int
    date: date
    status: str  # 'ABSENT_JUSTIFIED' | 'ABSENT_UNJUSTIFIED'
    justification_note: str | None = None
