"""
tests/test_permissions.py
-------------------------
Day 2 permission tests (RBAC + IDOR edge cases).

T1:  Employee calls GET /api/users/ → 403
T10: Admin tries to deactivate themselves → 403
T11: Admin tries to deactivate the last active admin → 409
"""

from __future__ import annotations

from datetime import date, datetime, time, timezone

import jwt
import pytest
from fastapi import HTTPException

from app.core.security import hash_password, create_access_token, verify_password
from app.core.config import settings
from app.models.attendance import Attendance
from app.models.break_ import Break
from app.models.employee import Employee
from app.models.task import Task
from app.models.user import User
from app.services import user_service


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


def test_employee_profile_rejects_mass_assignment(client, db_session):
    employee_user = _make_user(db_session, "profile-emp@logicat.ma", "Emp123!", "EMPLOYEE")
    employee = Employee(user_id=employee_user.id, department="Finance")
    db_session.add(employee)
    db_session.commit()

    response = client.patch(
        "/api/employees/me/profile",
        json={"phone": "0600000000", "role": "ADMIN_RH", "department": "IT"},
        headers=_auth_header(_make_token(employee_user)),
    )

    assert response.status_code == 200
    assert response.json()["phone"] == "0600000000"
    db_session.refresh(employee_user)
    db_session.refresh(employee)
    assert employee_user.phone == "0600000000"
    assert employee_user.role == "EMPLOYEE"
    assert employee.department == "Finance"

    me_response = client.get("/api/auth/me", headers=_auth_header(_make_token(employee_user)))
    assert me_response.status_code == 200
    assert me_response.json()["phone"] == "0600000000"


def test_employee_can_update_password_and_only_hash_is_persisted(client, db_session):
    old_password = "OldEmp123!"
    new_password = "NewEmp456!"
    employee_user = _make_user(db_session, "password-profile-emp@logicat.ma", old_password, "EMPLOYEE")
    db_session.add(Employee(user_id=employee_user.id, department="Finance"))
    db_session.commit()

    response = client.patch(
        "/api/employees/me/profile",
        json={"password": new_password},
        headers=_auth_header(_make_token(employee_user)),
    )

    assert response.status_code == 200
    assert "password" not in response.json()
    assert "password_hash" not in response.json()
    db_session.refresh(employee_user)
    assert employee_user.password_hash != new_password
    assert verify_password(new_password, employee_user.password_hash)
    assert not verify_password(old_password, employee_user.password_hash)

    new_login = client.post(
        "/api/auth/login",
        json={"email": employee_user.email, "password": new_password},
    )
    old_login = client.post(
        "/api/auth/login",
        json={"email": employee_user.email, "password": old_password},
    )
    assert new_login.status_code == 200
    assert old_login.status_code == 401


def test_employee_id_query_parameters_cannot_select_another_employees_data(client, db_session):
    user_a = _make_user(db_session, "query-a@logicat.ma", "Emp123!", "EMPLOYEE")
    employee_a = Employee(user_id=user_a.id, department="IT")
    user_b = _make_user(db_session, "query-b@logicat.ma", "Emp123!", "EMPLOYEE")
    employee_b = Employee(user_id=user_b.id, department="HR")
    db_session.add_all([employee_a, employee_b])
    db_session.commit()
    task = Task(title="Private task", assigned_to=employee_b.id, created_by=user_a.id)
    attendance = Attendance(employee_id=employee_b.id, date=date(2026, 11, 10), status="PRESENT")
    db_session.add_all([task, attendance])
    db_session.commit()

    token = _make_token(user_a)
    tasks_response = client.get(
        f"/api/tasks/me?employee_id={employee_b.id}", headers=_auth_header(token)
    )
    attendance_response = client.get(
        f"/api/attendances/me?employee_id={employee_b.id}", headers=_auth_header(token)
    )

    assert tasks_response.status_code == 200
    assert tasks_response.json() == []
    assert attendance_response.status_code == 200
    assert attendance_response.json() == []


def test_unknown_role_cannot_use_attendance_detail_admin_path(client, db_session):
    employee_user = _make_user(db_session, "owned@logicat.ma", "Emp123!", "EMPLOYEE")
    employee = Employee(user_id=employee_user.id, department="IT")
    unknown_user = _make_user(db_session, "unknown@logicat.ma", "Emp123!", "MANAGER")
    db_session.add(employee)
    db_session.commit()
    attendance = Attendance(employee_id=employee.id, date=date(2026, 11, 10), status="PRESENT")
    db_session.add(attendance)
    db_session.commit()

    response = client.get(
        f"/api/attendances/{attendance.id}", headers=_auth_header(_make_token(unknown_user))
    )

    assert response.status_code == 403


def test_signed_token_with_invalid_subject_returns_401(client, db_session):
    user = _make_user(db_session, "invalid-subject@logicat.ma", "Emp123!", "EMPLOYEE")
    token = jwt.encode({"sub": "not-an-id", "role": user.role}, settings.secret_key, algorithm="HS256")

    response = client.get("/api/auth/me", headers=_auth_header(token))

    assert response.status_code == 401


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
    admin1 = _make_user(db_session, "admin1@logicat.ma", "Admin123!", "ADMIN_RH")
    admin2 = _make_user(db_session, "admin2@logicat.ma", "Admin123!", "ADMIN_RH")
    token = _make_token(admin1)
    response = client.patch(
        f"/api/users/{admin2.id}/deactivate", headers=_auth_header(token)
    )
    assert response.status_code == 409


# ---------------------------------------------------------------------------
# T12: Admin tries to change their own role (self-demotion) → 400
# ---------------------------------------------------------------------------

def test_admin_cannot_change_own_role(client, db_session):
    admin = _make_user(db_session, "admin1@logicat.ma", "Admin123!", "ADMIN_RH")
    token = _make_token(admin)
    response = client.put(
        f"/api/users/{admin.id}",
        json={"role": "EMPLOYEE"},
        headers=_auth_header(token),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Vous ne pouvez pas modifier votre propre rôle."

    db_session.refresh(admin)
    assert admin.role == "ADMIN_RH"


# ---------------------------------------------------------------------------
# T13: Admin can still change another admin's role
# ---------------------------------------------------------------------------

def test_admin_can_change_another_admin_role(client, db_session):
    admin1 = _make_user(db_session, "admin1@logicat.ma", "Admin123!", "ADMIN_RH")
    admin2 = _make_user(db_session, "admin2@logicat.ma", "Admin123!", "ADMIN_RH")
    token = _make_token(admin1)

    response = client.put(
        f"/api/users/{admin2.id}",
        json={"role": "EMPLOYEE"},
        headers=_auth_header(token),
    )
    assert response.status_code == 200
    assert response.json()["role"] == "EMPLOYEE"


def test_admin_can_update_employee_expected_schedule(client, db_session):
    admin = _make_user(db_session, "admin_schedule@logicat.ma", "Admin123!", "ADMIN_RH")
    employee_user = _make_user(db_session, "employee_schedule@logicat.ma", "Emp123!", "EMPLOYEE")
    employee = Employee(user_id=employee_user.id, department="IT")
    db_session.add(employee)
    db_session.commit()
    token = _make_token(admin)

    response = client.put(
        f"/api/users/{employee_user.id}",
        json={"expected_start_time": "10:00", "expected_end_time": "17:00"},
        headers=_auth_header(token),
    )

    assert response.status_code == 200
    db_session.refresh(employee)
    assert employee.expected_start_time == time(10, 0)
    assert employee.expected_end_time == time(17, 0)

    detail = client.get(f"/api/users/{employee_user.id}", headers=_auth_header(token))
    assert detail.status_code == 200
    assert detail.json()["expected_start_time"] == "10:00:00"
    assert detail.json()["expected_end_time"] == "17:00:00"


# ---------------------------------------------------------------------------
# T14: Admin tries to hard-delete themselves → 403
# ---------------------------------------------------------------------------

def test_admin_cannot_delete_self(client, db_session):
    admin = _make_user(db_session, "admin1@logicat.ma", "Admin123!", "ADMIN_RH")
    _make_user(db_session, "admin2@logicat.ma", "Admin123!", "ADMIN_RH")
    token = _make_token(admin)

    response = client.delete(f"/api/users/{admin.id}", headers=_auth_header(token))
    assert response.status_code == 403
    assert db_session.get(User, admin.id) is not None


# ---------------------------------------------------------------------------
# T15: Deleting the last active admin → 409 (service-level rule)
# ---------------------------------------------------------------------------

def test_delete_last_active_admin_blocked(db_session):
    admin = _make_user(db_session, "admin1@logicat.ma", "Admin123!", "ADMIN_RH")

    # A different (non-persisted) caller so the self-delete guard does not fire.
    other_admin = User(
        id=9999,
        email="other@logicat.ma",
        password_hash="x",
        first_name="Other",
        last_name="Admin",
        role="ADMIN_RH",
        is_active=True,
    )

    with pytest.raises(HTTPException) as exc:
        user_service.delete_user(db_session, admin.id, other_admin)
    assert exc.value.status_code == 409
    assert db_session.get(User, admin.id) is not None


# ---------------------------------------------------------------------------
# T16: Deleting an employee who still has tasks → 409
# ---------------------------------------------------------------------------

def test_cannot_delete_employee_with_tasks(client, db_session):
    admin = _make_user(db_session, "admin1@logicat.ma", "Admin123!", "ADMIN_RH")
    employee_user = _make_user(db_session, "emp@logicat.ma", "Emp123!", "EMPLOYEE")
    employee = Employee(user_id=employee_user.id, department="IT")
    db_session.add(employee)
    db_session.commit()
    db_session.refresh(employee)

    db_session.add(
        Task(title="Tâche bloquante", assigned_to=employee.id, created_by=admin.id)
    )
    db_session.commit()

    token = _make_token(admin)
    response = client.delete(
        f"/api/users/{employee_user.id}", headers=_auth_header(token)
    )
    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Cet employé a des tâches assignées. "
        "Veuillez les réassigner avant de le supprimer."
    )
    assert db_session.get(User, employee_user.id) is not None


# ---------------------------------------------------------------------------
# T17: Successful delete removes employee + attendances + breaks
# ---------------------------------------------------------------------------

def test_delete_employee_cascades_attendance_data(client, db_session):
    admin = _make_user(db_session, "admin1@logicat.ma", "Admin123!", "ADMIN_RH")
    employee_user = _make_user(db_session, "emp@logicat.ma", "Emp123!", "EMPLOYEE")
    employee = Employee(user_id=employee_user.id, department="IT")
    db_session.add(employee)
    db_session.commit()
    db_session.refresh(employee)

    attendance = Attendance(
        employee_id=employee.id, date=date(2026, 11, 10), status="PRESENT"
    )
    db_session.add(attendance)
    db_session.commit()
    db_session.refresh(attendance)
    db_session.add(
        Break(
            attendance_id=attendance.id,
            type="MORNING",
            start_time=datetime(2026, 11, 10, 10, 30, tzinfo=timezone.utc),
            end_time=datetime(2026, 11, 10, 10, 45, tzinfo=timezone.utc),
        )
    )
    db_session.commit()

    user_id = employee_user.id
    employee_id = employee.id
    attendance_id = attendance.id

    token = _make_token(admin)
    response = client.delete(
        f"/api/users/{user_id}", headers=_auth_header(token)
    )
    assert response.status_code == 200
    assert response.json()["detail"] == "User deleted"

    db_session.expire_all()
    assert db_session.get(User, user_id) is None
    assert db_session.get(Employee, employee_id) is None
    assert db_session.get(Attendance, attendance_id) is None
    assert (
        db_session.query(Break)
        .filter(Break.attendance_id == attendance_id)
        .count()
        == 0
    )
