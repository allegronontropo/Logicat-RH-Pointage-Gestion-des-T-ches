"""
app/routers/auth.py
-------------------
Authentication router.

Endpoints:
  POST /api/auth/login   — email + password → JWT access token + user info
  GET  /api/auth/me      — returns the current authenticated user
  POST /api/auth/logout  — server acknowledges logout (client clears token)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core import security
from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in with email and password",
    description="Verify credentials and return a JWT access token plus user info.",
)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate a user by email and password.

    Raises HTTP 401 if the email is not found, the password is wrong,
    or the account is deactivated.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not security.verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account deactivated",
        )

    access_token = security.create_access_token(user_id=user.id, role=user.role)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current authenticated user",
    description="Returns the current user. Requires a valid, active session.",
)
def me(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    """Return the currently authenticated user."""
    return UserRead.model_validate(current_user)


@router.post(
    "/logout",
    summary="Log out",
    description="Acknowledges logout. Token invalidation is handled client-side.",
)
def logout() -> dict[str, str]:
    """Server-side logout acknowledgement."""
    return {"detail": "Logged out"}
