"""
app/schemas/auth.py
--------------------
Pydantic schemas for authentication.
"""

from __future__ import annotations

from datetime import date
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Request body for POST /api/auth/login."""

    email: EmailStr
    password: str = Field(min_length=1)


class EmployeeProfileRead(BaseModel):
    """Employee profile summary for authenticated user."""

    id: int
    department: str | None = None
    position: str | None = None
    hire_date: date | None = None

    model_config = {"from_attributes": True}


class UserRead(BaseModel):
    """Public user representation returned by auth endpoints."""

    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    employee_profile: EmployeeProfileRead | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Response body for POST /api/auth/login."""

    access_token: str
    token_type: str = "bearer"
    user: UserRead
