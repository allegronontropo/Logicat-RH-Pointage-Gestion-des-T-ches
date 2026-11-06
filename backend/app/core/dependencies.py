"""
app/core/dependencies.py
------------------------
FastAPI dependency injection for database sessions and authentication.

- get_db: yields a SQLAlchemy session (re-exported from app.database.session).
- get_current_user: decodes the Bearer JWT, loads the User from the DB,
  and verifies is_active. Raises 401 on any failure.
- get_current_employee: wraps get_current_user; raises 403 if role != EMPLOYEE,
  then loads and returns the Employee profile.
- require_admin: wraps get_current_user; raises 403 if role != ADMIN_RH.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core import security
from app.models.user import User
from app.models.employee import Employee


# ---------------------------------------------------------------------------
# Security scheme
# ---------------------------------------------------------------------------

oauth2_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Authentication dependencies
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Decode the Bearer JWT, load the User from the DB, and verify is_active.

    Raises HTTP 401 if:
      - no credentials are provided,
      - the token is malformed/expired/invalid,
      - the user is not found in the DB,
      - the user's is_active is False.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = security.decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = int(payload["sub"])
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_employee(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Employee:
    """Load and return the Employee profile for the current User.

    Raises HTTP 403 if the current user's role is not EMPLOYEE, or if no
    Employee profile exists for the user.
    """
    if current_user.role != "EMPLOYEE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee access required",
        )

    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee profile not found",
        )

    return employee


def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Return the current user if they are ADMIN_RH, else raise HTTP 403."""
    if current_user.role != "ADMIN_RH":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user
