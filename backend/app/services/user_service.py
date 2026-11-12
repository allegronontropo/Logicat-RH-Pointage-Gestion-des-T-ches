"""
app/services/user_service.py
----------------------------
Business logic for user management (admin operations).

All functions operate within a SQLAlchemy session and raise HTTPException
for business-rule violations. Routers should not contain business logic.
"""

from __future__ import annotations

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.attendance import Attendance
from app.models.break_ import Break
from app.models.employee import Employee
from app.models.task import Task
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def create_user(
    db: Session, user_data: UserCreate, current_user_id: int
) -> User:
    """Transactionally create a User and, if role is EMPLOYEE, an Employee row.

    Raises HTTP 409 if the email already exists.
    """
    # Check for duplicate email
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=user_data.role,
        is_active=True,
    )
    db.add(user)
    db.flush()  # Assign user.id before creating the employee row

    if user_data.role == "EMPLOYEE":
        employee = Employee(
            user_id=user.id,
            department=user_data.department,
            position=user_data.position,
            hire_date=user_data.hire_date,
        )
        db.add(employee)

    db.commit()
    db.refresh(user)
    return user


def update_user(
    db: Session, target_id: int, update_data: UserUpdate, current_user: User
) -> User:
    """Update a user's fields. Only provided fields are changed.

    Raises HTTP 400 if an admin tries to change their own role: the JWT still
    carries the old role, so the change would immediately lock them out of (or
    silently escalate) admin routes until they log in again.
    """
    user = db.get(User, target_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    hire_date_was_provided = "hire_date" in update_dict
    hire_date = update_dict.pop("hire_date", None)
    expected_start_time = update_dict.pop("expected_start_time", None)
    expected_end_time = update_dict.pop("expected_end_time", None)

    # Rule: no self role change (self-demotion / self-promotion).
    if user.id == current_user.id:
        new_role = update_dict.get("role")
        if new_role is not None and new_role != user.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas modifier votre propre rôle.",
            )

    for field, value in update_dict.items():
        setattr(user, field, value)

    if user.employee is not None:
        if hire_date_was_provided:
            user.employee.hire_date = hire_date
        if expected_start_time is not None:
            user.employee.expected_start_time = expected_start_time
        if expected_end_time is not None:
            user.employee.expected_end_time = expected_end_time

    db.commit()
    db.refresh(user)
    return user


def deactivate_user(
    db: Session, target_id: int, current_user: User
) -> None:
    """Deactivate a user.

    Raises HTTP 409 if deactivating the target would leave fewer than two active ADMIN_RH accounts.
    Raises HTTP 403 if the target is the current user (self-deactivation).
    """
    target = db.get(User, target_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if target_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot deactivate your own account",
        )

    if target.role == "ADMIN_RH" and target.is_active:
        active_admins = (
            db.query(User)
            .filter(User.role == "ADMIN_RH", User.is_active == True)  # noqa: E712
            .count()
        )
        if active_admins <= 2:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Il faut conserver au moins deux comptes Admin RH actifs.",
            )

    target.is_active = False
    db.commit()


def activate_user(db: Session, target_id: int) -> User:
    """Reactivate a deactivated user."""
    user = db.get(User, target_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


def delete_user(
    db: Session, target_id: int, current_user: User
) -> None:
    """Permanently delete a user and their dependent attendance data.

    Safety rules:
      - 404 if the user does not exist.
      - 403 if the target is the current user (no self-deletion).
      - 409 if deleting the target would leave fewer than two active ADMIN_RH accounts.
      - 409 if the target employee still has unfinished tasks assigned to them.

    Breaks, attendances and the employee profile are removed explicitly so
    the cleanup also works on engines that do not enforce ON DELETE CASCADE
    (e.g. SQLite in tests); PostgreSQL cascades as a safety net.
    """
    target = db.get(User, target_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if target_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete your own account",
        )

    if target.role == "ADMIN_RH" and target.is_active:
        active_admins = (
            db.query(User)
            .filter(User.role == "ADMIN_RH", User.is_active == True)  # noqa: E712
            .count()
        )
        if active_admins <= 2:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Il faut conserver au moins deux comptes Admin RH actifs.",
            )

    employee = target.employee
    if employee is not None:
        # Only block if there are unfinished tasks. Finished (DONE) tasks can
        # be cascade-deleted along with the employee profile.
        assigned_tasks = (
            db.query(Task)
            .filter(Task.assigned_to == employee.id, Task.status != "DONE")
            .count()
        )
        if assigned_tasks > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Cet employé a des tâches assignées. "
                    "Veuillez les réassigner avant de le supprimer."
                ),
            )

        # Delete all tasks assigned to this employee (DB cascade alone is not
        # enough: SQLAlchemy ORM tries to NULL assigned_to before the employee
        # row is removed, which violates the NOT NULL constraint).
        db.query(Task).filter(Task.assigned_to == employee.id).delete(
            synchronize_session=False
        )

        attendance_ids = [
            row[0]
            for row in db.query(Attendance.id)
            .filter(Attendance.employee_id == employee.id)
            .all()
        ]
        if attendance_ids:
            db.query(Break).filter(
                Break.attendance_id.in_(attendance_ids)
            ).delete(synchronize_session=False)
            db.query(Attendance).filter(
                Attendance.id.in_(attendance_ids)
            ).delete(synchronize_session=False)

    db.delete(target)
    db.commit()


def reset_password(
    db: Session, target_id: int, new_password: str
) -> User:
    """Admin resets a user's password."""
    user = db.get(User, target_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user
