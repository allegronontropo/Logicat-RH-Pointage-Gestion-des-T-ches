"""
app/routers/employees.py
------------------------
Employee profile endpoints — Employee only.

Endpoints:
  PATCH /api/employees/me/profile   Update own phone and/or password only
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_employee, get_current_user, get_db
from app.models.employee import Employee
from app.models.user import User
from app.schemas.user import EmployeeProfileUpdate
from app.schemas.auth import UserRead
from app.core import security

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.patch(
    "/me/profile",
    response_model=UserRead,
    summary="Update own profile",
    description="Employee updates their own phone and/or password only. Role, department, position, name, and email are not modifiable here.",
)
def update_own_profile(
    profile_data: EmployeeProfileUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    current_employee: Annotated[Employee, Depends(get_current_employee)],
) -> UserRead:
    update_dict = profile_data.model_dump(exclude_unset=True)

    if "phone" in update_dict:
        current_user.phone = update_dict["phone"]

    if "password" in update_dict and update_dict["password"]:
        current_user.password_hash = security.hash_password(update_dict["password"])

    db.commit()
    db.refresh(current_user)
    return UserRead.model_validate(current_user)
