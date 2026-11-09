"""
app/routers/dashboard.py
------------------------
Dashboard endpoints — mixed roles.

Endpoints:
  GET /api/dashboard/admin    Admin KPIs
  GET /api/dashboard/employee Employee personal KPIs
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_employee, get_current_user, require_admin, get_db
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.task import Task
from app.models.user import User
from app.services import attendance_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get(
    "/admin",
    summary="Admin dashboard KPIs",
    description="Admin: active employees, present today, absences, task counts.",
)
def admin_dashboard(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> dict:
    today = attendance_service._today()

    active_employees = (
        db.query(User)
        .join(Employee, Employee.user_id == User.id)
        .filter(User.role == "EMPLOYEE", User.is_active == True)  # noqa: E712
        .count()
    )

    present_today = (
        db.query(Attendance)
        .join(Employee, Employee.id == Attendance.employee_id)
        .join(User, User.id == Employee.user_id)
        .filter(
            Attendance.date == today,
            Attendance.check_in.isnot(None),
            User.role == "EMPLOYEE",
        )
        .count()
    )

    absences_today = (
        db.query(Attendance)
        .filter(Attendance.date == today, Attendance.status.like("ABSENT_%"))
        .count()
    )

    total_tasks = db.query(Task).count()
    in_progress_tasks = db.query(Task).filter(Task.status == "IN_PROGRESS").count()
    done_tasks = db.query(Task).filter(Task.status == "DONE").count()

    return {
        "active_employees": active_employees,
        "present_today": present_today,
        "absences_today": absences_today,
        "total_tasks": total_tasks,
        "in_progress_tasks": in_progress_tasks,
        "done_tasks": done_tasks,
    }


@router.get(
    "/employee",
    summary="Employee dashboard KPIs",
    description="Employee: today's status, effective working time, task counters.",
)
def employee_dashboard(
    db: Annotated[Session, Depends(get_db)],
    current_employee: Annotated[Employee, Depends(get_current_employee)],
) -> dict:
    today = attendance_service._today()

    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == current_employee.id,
            Attendance.date == today,
        )
        .first()
    )

    status_value = "NOT_CHECKED_IN"
    effective_minutes = 0
    if attendance:
        status_value = attendance.status
        if attendance.check_in:
            _, _, effective_minutes = attendance_service.calculate_durations(attendance)

    todo_tasks = (
        db.query(Task)
        .filter(Task.assigned_to == current_employee.id, Task.status == "TODO")
        .count()
    )
    in_progress_tasks = (
        db.query(Task)
        .filter(Task.assigned_to == current_employee.id, Task.status == "IN_PROGRESS")
        .count()
    )
    done_tasks = (
        db.query(Task)
        .filter(Task.assigned_to == current_employee.id, Task.status == "DONE")
        .count()
    )

    return {
        "status": status_value,
        "effective_minutes": effective_minutes,
        "todo_tasks": todo_tasks,
        "in_progress_tasks": in_progress_tasks,
        "done_tasks": done_tasks,
    }
