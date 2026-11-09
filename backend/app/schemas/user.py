"""
app/schemas/user.py
-------------------
Pydantic schemas for user management.
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from pydantic import BaseModel, EmailStr, Field

if TYPE_CHECKING:
    from app.models.user import User


class UserCreate(BaseModel):
    """Request body for POST /api/users (admin creates a user)."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    role: str  # 'ADMIN_RH' | 'EMPLOYEE'
    department: str | None = Field(default=None, max_length=100)
    position: str | None = Field(default=None, max_length=100)
    hire_date: date | None = None


class UserUpdate(BaseModel):
    """Request body for PUT /api/users/{id} (admin edits a user)."""

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    role: str | None = None
    department: str | None = Field(default=None, max_length=100)
    position: str | None = Field(default=None, max_length=100)
    hire_date: date | None = None
    is_active: bool | None = None


class ResetPasswordRequest(BaseModel):
    """Request body for PATCH /api/users/{id}/reset-password."""

    new_password: str = Field(min_length=8, max_length=128)



class EmployeeProfileUpdate(BaseModel):
    """Request body for PATCH /api/employees/me/profile (employee edits own profile).

    Only phone and password are allowed — enforced by the schema itself.
    """

    phone: str | None = Field(default=None, max_length=30)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserReadDetail(BaseModel):
    """Detailed user representation including employee profile info."""

    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    department: str | None = None
    position: str | None = None
    hire_date: date | None = None

    @classmethod
    def from_orm(cls, user: "User") -> "UserReadDetail":
        employee = user.employee
        return cls(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_active=user.is_active,
            department=employee.department if employee else None,
            position=employee.position if employee else None,
            hire_date=employee.hire_date if employee else None,
        )

    model_config = {"from_attributes": True}
