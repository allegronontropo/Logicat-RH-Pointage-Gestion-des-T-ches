"""
tests/test_permissions.py
-------------------------
Day 2 permission tests (RBAC + IDOR edge cases).

T1:  Employee calls GET /api/users/ → 403
T10: Admin tries to deactivate themselves → 403
T11: Admin tries to deactivate the last active admin → 409
"""

from __future__ import annotations

from app.core.security import hash_password, create_access_token
from app.models.user import User


def _make_user(db_session, email: str, password: str, role: str, is_active: bool = True) -> User:
    user = User(
        email=email,
        password_hash=hash_password(password),
        first_name="Test",
        last_name="User",
        role=role,
        is_active=is_active,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _make_token(user: User) -> str:
    return create_access_token(user_id=user.id, role=user.role)


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# T1: Employee calls GET /api/users/ → 403
# ---------------------------------------------------------------------------

def test_employee_cannot_list_users(client, db_session):
    employee = _make_user(db_session, "emp@logicat.ma", "Emp123!", "EMPLOYEE")
    token = _make_token(employee)
    response = client.get("/api/users/", headers=_auth_header(token))
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# T10: Admin tries to deactivate themselves → 403 (with 2+ admins)
# ---------------------------------------------------------------------------

def test_admin_cannot_deactivate_self(client, db_session):
    admin1 = _make_user(db_session, "admin1@logicat.ma", "Admin123!", "ADMIN_RH")
    admin2 = _make_user(db_session, "admin2@logicat.ma", "Admin123!", "ADMIN_RH")
    token = _make_token(admin1)
    response = client.patch(
        f"/api/users/{admin1.id}/deactivate", headers=_auth_header(token)
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# T11: Admin tries to deactivate the last active admin → 409
# ---------------------------------------------------------------------------

def test_admin_cannot_deactivate_last_admin(client, db_session):
    admin = _make_user(db_session, "admin1@logicat.ma", "Admin123!", "ADMIN_RH")
    token = _make_token(admin)
    response = client.patch(
        f"/api/users/{admin.id}/deactivate", headers=_auth_header(token)
    )
    assert response.status_code == 409
