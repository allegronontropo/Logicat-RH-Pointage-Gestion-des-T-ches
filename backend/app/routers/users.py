"""
app/routers/users.py
--------------------
User management endpoints — Admin RH only.

Endpoints:
  POST   /api/users                              Create user (+ employee row if EMPLOYEE)
  GET    /api/users                              List users with search/filter
  GET    /api/users/{id}                         User detail + employee profile
  PUT    /api/users/{id}                         Update user
  PATCH  /api/users/{id}/deactivate              Deactivate (self + last-admin protected)
  PATCH  /api/users/{id}/activate                Reactivate
  PATCH  /api/users/{id}/reset-password          Admin sets a new password
  DELETE /api/users/{id}                         Hard delete (self/last-admin/tasks protected)
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin, get_db
from app.models.user import User
from app.models.employee import Employee
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    EmployeeProfileUpdate,
    UserReadDetail,
    ResetPasswordRequest,
)
from app.schemas.auth import UserRead
from app.services import user_service

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserRead, include_in_schema=False, status_code=status.HTTP_201_CREATED)
@router.post(
    "/",
    response_model=UserRead,
    summary="Create user",
    description="Admin creates a user. If role is EMPLOYEE, an employee row is also created.",
    status_code=status.HTTP_201_CREATED,
)
def create_user_endpoint(
    user_data: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> UserRead:
    user = user_service.create_user(db, user_data, current_user.id)
    return UserRead.model_validate(user)


@router.get("", response_model=list[UserRead], include_in_schema=False)
@router.get(
    "/",
    response_model=list[UserRead],
    summary="List users",
    description="List users with optional search (?q=), role (?role=), and is_active (?is_active=) filters.",
)
def list_users(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    q: str | None = Query(default=None, description="Search by name or email"),
    role: str | None = Query(default=None, description="Filter by role"),
    is_active: bool | None = Query(default=None, description="Filter by active status"),
) -> list[UserRead]:
    query = db.query(User)

    if q:
        search = f"%{q}%"
        query = query.filter(
            (User.first_name.ilike(search))
            | (User.last_name.ilike(search))
            | (User.email.ilike(search))
        )
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    users = query.order_by(User.id).all()
    return [UserRead.model_validate(u) for u in users]


@router.get(
    "/{user_id}",
    response_model=UserReadDetail,
    summary="Get user detail",
    description="Get a user by ID, including employee profile information.",
)
def get_user_detail(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> UserReadDetail:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserReadDetail.from_orm(user)


@router.put(
    "/{user_id}",
    response_model=UserRead,
    summary="Update user",
    description="Admin updates a user's information.",
)
def update_user_endpoint(
    user_id: int,
    update_data: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> UserRead:
    user = user_service.update_user(db, user_id, update_data, current_user)
    return UserRead.model_validate(user)


@router.patch(
    "/{user_id}/deactivate",
    summary="Deactivate user",
    description="Deactivate a user. Blocked if self or last active ADMIN_RH.",
)
def deactivate_user_endpoint(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> dict[str, str]:
    user_service.deactivate_user(db, user_id, current_user)
    return {"detail": "User deactivated"}


@router.patch(
    "/{user_id}/activate",
    summary="Activate user",
    description="Reactivate a deactivated user.",
)
def activate_user_endpoint(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> UserRead:
    user = user_service.activate_user(db, user_id)
    return UserRead.model_validate(user)


@router.patch(
    "/{user_id}/reset-password",
    summary="Reset user password",
    description="Admin sets a new password for a user.",
)
def reset_password_endpoint(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    new_password: str | None = Query(default=None),
    body: ResetPasswordRequest | None = None,
) -> UserRead:
    pwd = (body.new_password if body else None) or new_password
    if not pwd or len(pwd) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le mot de passe doit comporter au moins 8 caractères.",
        )
    user = user_service.reset_password(db, user_id, pwd)
    return UserRead.model_validate(user)


@router.delete(
    "/{user_id}",
    summary="Delete user",
    description=(
        "Permanently delete a user. Blocked if self, last active ADMIN_RH, "
        "or the employee still has tasks assigned."
    ),
)
def delete_user_endpoint(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> dict[str, str]:
    user_service.delete_user(db, user_id, current_user)
    return {"detail": "User deleted"}
