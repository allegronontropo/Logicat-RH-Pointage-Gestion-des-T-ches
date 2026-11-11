"""
app/routers/attendances.py
--------------------------
Attendance endpoints — mixed roles.

Employee (via get_current_employee):
  POST   /api/attendances/check-in
  POST   /api/attendances/check-out
  GET    /api/attendances/today
  GET    /api/attendances/me

Admin (via require_admin):
  GET    /api/attendances                    List all attendance (filters: ?employee_id=, ?date_from=, ?date_to=, ?department=)
  POST   /api/attendances/absences           Declare an absence
"""

from __future__ import annotations

from typing import Annotated
from datetime import date
import csv
import io

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_employee, get_current_user, require_admin, get_db
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.user import User
from app.models.break_ import Break
from app.schemas.attendance import (
    AttendanceResponse,
    AbsenceCreate,
    AbsenceJustifyRequest,
    AttendanceStatusOverrideRequest,
)
from app.services import attendance_service

router = APIRouter(prefix="/api/attendances", tags=["attendances"])


# ---------------------------------------------------------------------------
# Employee endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/check-in",
    response_model=AttendanceResponse,
    summary="Check in",
    description="Employee checks in for today. Creates an attendance record.",
    status_code=status.HTTP_201_CREATED,
)
def check_in_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_employee: Annotated[Employee, Depends(get_current_employee)],
) -> AttendanceResponse:
    attendance = attendance_service.check_in(db, current_employee.id)
    attendance = (
        db.query(Attendance)
        .options(joinedload(Attendance.breaks))
        .filter(Attendance.id == attendance.id)
        .first()
    )
    return AttendanceResponse.from_orm_with_durations(attendance)


@router.post(
    "/check-out",
    response_model=AttendanceResponse,
    summary="Check out",
    description="Employee checks out for today. Blocked if a break is active.",
)
def check_out_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_employee: Annotated[Employee, Depends(get_current_employee)],
) -> AttendanceResponse:
    attendance = attendance_service.check_out(db, current_employee.id)
    attendance = (
        db.query(Attendance)
        .options(joinedload(Attendance.breaks))
        .filter(Attendance.id == attendance.id)
        .first()
    )
    return AttendanceResponse.from_orm_with_durations(attendance)


@router.get(
    "/today",
    response_model=AttendanceResponse,
    summary="Get today's attendance",
    description="Returns today's attendance record with breaks and computed durations.",
)
def get_today_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_employee: Annotated[Employee, Depends(get_current_employee)],
) -> AttendanceResponse:
    today = attendance_service._today()
    attendance = (
        db.query(Attendance)
        .options(joinedload(Attendance.breaks))
        .filter(
            Attendance.employee_id == current_employee.id,
            Attendance.date == today,
        )
        .first()
    )
    if attendance is None:
        # Return an empty response rather than 404 (per T15 in PROJECT_PLAN)
        from app.schemas.attendance import BreakSummary
        return AttendanceResponse(
            id=0,
            employee_id=current_employee.id,
            date=today,
            status="NOT_CHECKED_IN",
            breaks=[],
        )
    return AttendanceResponse.from_orm_with_durations(attendance)


@router.get(
    "/me",
    response_model=list[AttendanceResponse],
    summary="Get my attendance history",
    description="Returns the employee's attendance history with optional date filters.",
)
def get_my_attendance(
    db: Annotated[Session, Depends(get_db)],
    current_employee: Annotated[Employee, Depends(get_current_employee)],
    date_from: date | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: date | None = Query(default=None, description="End date (YYYY-MM-DD)"),
) -> list[AttendanceResponse]:
    query = (
        db.query(Attendance)
        .options(joinedload(Attendance.breaks))
        .filter(Attendance.employee_id == current_employee.id)
    )
    if date_from:
        query = query.filter(Attendance.date >= date_from)
    if date_to:
        query = query.filter(Attendance.date <= date_to)

    attendances = query.order_by(Attendance.date.desc()).all()
    return [AttendanceResponse.from_orm_with_durations(a) for a in attendances]


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=list[AttendanceResponse], include_in_schema=False)
@router.get(
    "/",
    response_model=list[AttendanceResponse],
    summary="List all attendance",
    description="Admin: list all attendance records with optional filters.",
)
def list_all_attendance(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    employee_id: int | None = Query(default=None, description="Filter by employee ID"),
    department: str | None = Query(default=None, description="Filter by employee department"),
    date: date | None = Query(default=None, description="Filter by exact date (YYYY-MM-DD)"),
    date_from: date | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: date | None = Query(default=None, description="End date (YYYY-MM-DD)"),
) -> list[AttendanceResponse]:
    query = db.query(Attendance).options(
        joinedload(Attendance.breaks),
        joinedload(Attendance.employee).joinedload(Employee.user),
    )

    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    if department:
        query = query.join(
            Employee, Attendance.employee_id == Employee.id
        ).filter(Employee.department == department)
    if date:
        query = query.filter(Attendance.date == date)
    else:
        if date_from:
            query = query.filter(Attendance.date >= date_from)
        if date_to:
            query = query.filter(Attendance.date <= date_to)

    attendances = query.order_by(Attendance.date.desc()).all()
    return [AttendanceResponse.from_orm_with_durations(a) for a in attendances]


@router.post(
    "/absences",
    response_model=list[AttendanceResponse],
    summary="Declare absence",
    description="Admin declares a justified or unjustified absence for an employee across a date range.",
    status_code=status.HTTP_201_CREATED,
)
def declare_absence_endpoint(
    absence_data: AbsenceCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> list[AttendanceResponse]:
    start = absence_data.start_date or absence_data.date
    end = absence_data.end_date or start
    if not start or not end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date and end_date are required",
        )
    records = attendance_service.declare_absence(
        db,
        employee_id=absence_data.employee_id,
        start_date=start,
        end_date=end,
        status=absence_data.status,
        justification_note=absence_data.justification_note,
        override=absence_data.override,
    )
    if not records:
        return []

    record_ids = [r.id for r in records]
    attendances = (
        db.query(Attendance)
        .options(
            joinedload(Attendance.breaks),
            joinedload(Attendance.employee).joinedload(Employee.user),
        )
        .filter(Attendance.id.in_(record_ids))
        .order_by(Attendance.date.asc())
        .all()
    )
    return [AttendanceResponse.from_orm_with_durations(a) for a in attendances]


@router.patch(
    "/{attendance_id}/status",
    response_model=AttendanceResponse,
    summary="Update attendance status (early departure / permission)",
    description="Admin overrides status (e.g. to ABSENT_JUSTIFIED for early departure/permission) with a justification note.",
)
def override_attendance_status_endpoint(
    attendance_id: int,
    data: AttendanceStatusOverrideRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> AttendanceResponse:
    attendance = attendance_service.override_status(
        db, attendance_id, data.status, data.justification_note
    )
    attendance = (
        db.query(Attendance)
        .options(
            joinedload(Attendance.breaks),
            joinedload(Attendance.employee).joinedload(Employee.user),
        )
        .filter(Attendance.id == attendance.id)
        .first()
    )
    return AttendanceResponse.from_orm_with_durations(attendance)


@router.patch(
    "/{attendance_id}/justify",
    response_model=AttendanceResponse,
    summary="Justify an absence",
    description="Admin updates an unjustified absence to justified with a justification note.",
)
def justify_absence_endpoint(
    attendance_id: int,
    data: AbsenceJustifyRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> AttendanceResponse:
    attendance = attendance_service.justify_absence(
        db,
        attendance_id=attendance_id,
        justification_note=data.justification_note,
    )
    attendance = (
        db.query(Attendance)
        .options(
            joinedload(Attendance.breaks),
            joinedload(Attendance.employee).joinedload(Employee.user),
        )
        .filter(Attendance.id == attendance.id)
        .first()
    )
    return AttendanceResponse.from_orm_with_durations(attendance)


@router.get(
    "/export/{employee_id}",
    summary="Export employee attendance to CSV",
    description="Admin: export attendance records for an employee to CSV.",
)
def export_employee_attendance_csv(
    employee_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    month: str | None = Query(default=None, description="Filter by month (YYYY-MM)"),
) -> StreamingResponse:
    # Resolve employee: supports both employee.id or user.id
    employee = (
        db.query(Employee)
        .filter((Employee.id == employee_id) | (Employee.user_id == employee_id))
        .first()
    )
    target_emp_id = employee.id if employee else employee_id

    query = (
        db.query(Attendance)
        .options(joinedload(Attendance.breaks))
        .filter(Attendance.employee_id == target_emp_id)
    )

    if month:
        try:
            parts = month.split("-")
            year = int(parts[0])
            m = int(parts[1])
            import calendar
            _, last_day = calendar.monthrange(year, m)
            start_d = date(year, m, 1)
            end_d = date(year, m, last_day)
            query = query.filter(Attendance.date >= start_d, Attendance.date <= end_d)
        except Exception:
            pass

    attendances = query.order_by(Attendance.date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date",
        "Check-in",
        "Check-out",
        "Total Breaks",
        "Effective Hours",
        "Status",
    ])

    for att in attendances:
        _, break_mins, eff_mins = attendance_service.calculate_durations(att)
        check_in_str = att.check_in.strftime("%H:%M:%S") if att.check_in else ""
        check_out_str = att.check_out.strftime("%H:%M:%S") if att.check_out else ""
        break_str = f"{break_mins // 60}h {break_mins % 60:02d}m" if break_mins > 0 else "0h 00m"
        eff_str = f"{eff_mins // 60}h {eff_mins % 60:02d}m" if eff_mins > 0 else "0h 00m"

        writer.writerow([
            att.date.isoformat(),
            check_in_str,
            check_out_str,
            break_str,
            eff_str,
            att.status,
        ])

    csv_content = output.getvalue()
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"},
    )


@router.get(
    "/{attendance_id}",
    response_model=AttendanceResponse,
    summary="Get attendance by ID",
    description="Get an attendance record by ID. Employees can only see their own; admins can see all.",
)
def get_attendance_by_id(
    attendance_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AttendanceResponse:
    attendance = (
        db.query(Attendance)
        .options(joinedload(Attendance.breaks))
        .filter(Attendance.id == attendance_id)
        .first()
    )
    if attendance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance not found",
        )

    # IDOR: employees can only see their own attendance. Unknown roles are
    # denied explicitly instead of inheriting the administrator access path.
    if current_user.role == "EMPLOYEE":
        employee = (
            db.query(Employee)
            .filter(Employee.user_id == current_user.id)
            .first()
        )
        if employee is None or attendance.employee_id != employee.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance not found",
            )
    elif current_user.role != "ADMIN_RH":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or employee access required",
        )

    return AttendanceResponse.from_orm_with_durations(attendance)
