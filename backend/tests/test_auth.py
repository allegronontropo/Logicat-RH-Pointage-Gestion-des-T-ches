"""
tests/test_auth.py
------------------
Exactly 8 authentication tests for Day 1 foundation verification.

1. test_login_success
2. test_login_wrong_password
3. test_login_nonexistent_email
4. test_login_inactive_user
5. test_me_with_valid_token
6. test_me_with_inactive_user_token
7. test_me_with_malformed_token
8. test_me_without_token
"""

from __future__ import annotations

from app.core.security import hash_password, create_access_token
from app.models.user import User


def _create_user(db_session, email: str, password: str, is_active: bool = True, role: str = "EMPLOYEE") -> User:
    """Helper to insert a user directly into the test database."""
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


# ---------------------------------------------------------------------------
# Login tests
# ---------------------------------------------------------------------------

def test_login_success(client, db_session):
    """Valid credentials return 200 with an access token."""
    _create_user(db_session, "success@logicat.ma", "Password123!", is_active=True)
    response = client.post(
        "/api/auth/login",
        json={"email": "success@logicat.ma", "password": "Password123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "success@logicat.ma"


def test_login_wrong_password(client, db_session):
    """Wrong password returns 401."""
    _create_user(db_session, "wrong@logicat.ma", "Password123!", is_active=True)
    response = client.post(
        "/api/auth/login",
        json={"email": "wrong@logicat.ma", "password": "WrongPassword!"},
    )
    assert response.status_code == 401


def test_login_nonexistent_email(client, db_session):
    """Nonexistent email returns 401."""
    response = client.post(
        "/api/auth/login",
        json={"email": "nonexistent@logicat.ma", "password": "Password123!"},
    )
    assert response.status_code == 401


def test_login_inactive_user(client, db_session):
    """Inactive account returns 401 even with correct password."""
    _create_user(db_session, "inactive@logicat.ma", "Password123!", is_active=False)
    response = client.post(
        "/api/auth/login",
        json={"email": "inactive@logicat.ma", "password": "Password123!"},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# /me tests
# ---------------------------------------------------------------------------

def test_me_with_valid_token(client, db_session):
    """Valid token returns 200 and the current user."""
    user = _create_user(db_session, "me@logicat.ma", "Password123!", is_active=True)
    token = create_access_token(user_id=user.id, role=user.role)
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user.id
    assert data["email"] == "me@logicat.ma"


def test_me_with_inactive_user_token(client, db_session):
    """Deactivated user with a valid JWT is rejected with 401 (T5)."""
    user = _create_user(db_session, "deactivated@logicat.ma", "Password123!", is_active=True)
    token = create_access_token(user_id=user.id, role=user.role)
    user.is_active = False
    db_session.commit()
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


def test_me_with_malformed_token(client, db_session):
    """Malformed JWT returns 401, not 500 (T16)."""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer abc.def"},
    )
    assert response.status_code == 401


def test_me_without_token(client, db_session):
    """Missing token returns 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
