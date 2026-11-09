"""
app/schemas/attendance.py
-------------------------
Pydantic schemas for attendance and absences.
"""

from __future__ import annotations

from datetime import datetime
import datetime as dt
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, Field, model_validator

if TYPE_CHECKING:
    from app.models.break_ import Break


class BreakSummary(BaseModel):
    """Nested break summary inside AttendanceResponse."""

    id: int
    type: str
    start_time: datetime
    end_time: datetime | None = None

    model_config = {"from_attributes": True}


class EmployeeSummary(BaseModel):
    """Employee summary info for attendance list."""

    id: int
    first_name: str
    last_name: str
    department: str | None = None
    position: str | None = None

    model_config = {"from_attributes": True}


class AttendanceResponse(BaseModel):
    """Response body for attendance endpoints, including computed durations and employee info."""

    id: int
    employee_id: int
    employee_name: str | None = None
    employee: EmployeeSummary | None = None
    date: dt.date
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

        employee_summary = None
        employee_name = None
        if attendance.employee and attendance.employee.user:
            u = attendance.employee.user
            employee_name = f"{u.first_name} {u.last_name}"
            employee_summary = EmployeeSummary(
                id=attendance.employee.id,
                first_name=u.first_name,
                last_name=u.last_name,
                department=attendance.employee.department,
                position=attendance.employee.position,
            )

        return cls(
            id=attendance.id,
            employee_id=attendance.employee_id,
            employee_name=employee_name,
            employee=employee_summary,
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
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    date: dt.date | None = None
    status: str  # 'ABSENT_JUSTIFIED' | 'ABSENT_UNJUSTIFIED'
    justification_note: str | None = None
    override: bool = False

    @model_validator(mode="before")
    @classmethod
    def harmonize_dates(cls, data: Any) -> Any:
        if isinstance(data, dict):
            single = data.get("date")
            start = data.get("start_date") or single
            end = data.get("end_date") or start
            data["start_date"] = start
            data["end_date"] = end
        return data

    @model_validator(mode="after")
    def validate_dates(self) -> "AbsenceCreate":
        if not self.start_date or not self.end_date:
            raise ValueError("start_date and end_date are required")
        if self.start_date > self.end_date:
            raise ValueError("start_date must be before or equal to end_date")
        return self


class AbsenceJustifyRequest(BaseModel):
    """Request body for PATCH /api/attendances/{id}/justify."""

    justification_note: str = Field(..., min_length=1, max_length=255)


class AttendanceStatusOverrideRequest(BaseModel):
    """Request body for PATCH /api/attendances/{id}/status (early departure / permission override)."""

    status: str = Field(..., description="Target status, e.g. ABSENT_JUSTIFIED")
    justification_note: str | None = None
