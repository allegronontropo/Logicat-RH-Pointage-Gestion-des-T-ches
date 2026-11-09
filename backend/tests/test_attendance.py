"""
tests/test_attendance.py
------------------------
Day 2 attendance state machine tests.

T4:  Employee tries to fetch another employee's attendance by ID → 404
T6:  Double check-in same day → 409
T7:  Start break 2 without ending break 1 → 409
T8:  Check-out while break is active → 409
T9:  Start LUNCH break twice → 409
T13: Calculation: 09:00→18:00 with 15+60+15 min breaks → effective = 450 min
"""

from __future__ import annotations

from datetime import datetime, date, timezone

from app.core.security import hash_password, create_access_token
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.break_ import Break
from app.services.attendance_service import calculate_durations


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


def _make_employee(
    db_session, email: str, password: str, department: str = "IT", position: str = "Dev"
) -> tuple[User, Employee]:
    user = _make_user(db_session, email, password, "EMPLOYEE")
    employee = Employee(
        user_id=user.id,
        department=department,
        position=position,
        hire_date=None,
    )
    db_session.add(employee)
    db_session.commit()
    db_session.refresh(employee)
    return user, employee


def _make_token(user: User) -> str:
    return create_access_token(user_id=user.id, role=user.role)


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# T4: Employee tries to fetch another employee's attendance by ID → 404
# ---------------------------------------------------------------------------

def test_employee_fetch_another_attendance_by_id(client, db_session):
    user_a, emp_a = _make_employee(db_session, "emp_a@logicat.ma", "Emp123!")
    user_b, emp_b = _make_employee(db_session, "emp_b@logicat.ma", "Emp123!")

    # Employee A checks in
    token_a = _make_token(user_a)
    response = client.post(
        "/api/attendances/check-in", headers=_auth_header(token_a)
    )
    assert response.status_code == 201
    attendance_id = response.json()["id"]

    # Employee B tries to fetch Employee A's attendance
    token_b = _make_token(user_b)
    response = client.get(
        f"/api/attendances/{attendance_id}", headers=_auth_header(token_b)
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# T6: Double check-in same day → 409
# ---------------------------------------------------------------------------

def test_double_check_in(client, db_session):
    user, employee = _make_employee(db_session, "emp@logicat.ma", "Emp123!")
    token = _make_token(user)

    response1 = client.post(
        "/api/attendances/check-in", headers=_auth_header(token)
    )
    assert response1.status_code == 201

    response2 = client.post(
        "/api/attendances/check-in", headers=_auth_header(token)
    )
    assert response2.status_code == 409


# ---------------------------------------------------------------------------
# T7: Start break 2 without ending break 1 → 409
# ---------------------------------------------------------------------------

def test_start_break_without_ending_first(client, db_session):
    user, employee = _make_employee(db_session, "emp@logicat.ma", "Emp123!")
    token = _make_token(user)

    # Check in
    client.post("/api/attendances/check-in", headers=_auth_header(token))

    # Start MORNING break
    response = client.post(
        "/api/breaks/start",
        json={"type": "MORNING"},
        headers=_auth_header(token),
    )
    assert response.status_code == 201

    # Try to start LUNCH break without ending MORNING
    response = client.post(
        "/api/breaks/start",
        json={"type": "LUNCH"},
        headers=_auth_header(token),
    )
    assert response.status_code == 409


# ---------------------------------------------------------------------------
# T8: Check-out while break is active → 409
# ---------------------------------------------------------------------------

def test_checkout_during_active_break(client, db_session):
    user, employee = _make_employee(db_session, "emp@logicat.ma", "Emp123!")
    token = _make_token(user)

    # Check in
    client.post("/api/attendances/check-in", headers=_auth_header(token))

    # Start MORNING break
    client.post(
        "/api/breaks/start",
        json={"type": "MORNING"},
        headers=_auth_header(token),
    )

    # Try to check out
    response = client.post(
        "/api/attendances/check-out", headers=_auth_header(token)
    )
    assert response.status_code == 409


# ---------------------------------------------------------------------------
# T9: Start LUNCH break twice → 409
# ---------------------------------------------------------------------------

def test_start_lunch_twice(client, db_session):
    user, employee = _make_employee(db_session, "emp@logicat.ma", "Emp123!")
    token = _make_token(user)

    # Check in
    client.post("/api/attendances/check-in", headers=_auth_header(token))

    # Start LUNCH break
    response = client.post(
        "/api/breaks/start",
        json={"type": "LUNCH"},
        headers=_auth_header(token),
    )
    assert response.status_code == 201

    # Try to start LUNCH again
    response = client.post(
        "/api/breaks/start",
        json={"type": "LUNCH"},
        headers=_auth_header(token),
    )
    assert response.status_code == 409


# ---------------------------------------------------------------------------
# T13: Calculation test → effective = 450 minutes
# ---------------------------------------------------------------------------

def test_calculate_durations(client, db_session):
    user, employee = _make_employee(db_session, "emp@logicat.ma", "Emp123!")

    # Create attendance with specific times: 09:00 to 18:00
    attendance = Attendance(
        employee_id=employee.id,
        date=date.today(),
        check_in=datetime(2026, 11, 9, 9, 0, 0, tzinfo=timezone.utc),
        check_out=datetime(2026, 11, 9, 18, 0, 0, tzinfo=timezone.utc),
        status="PRESENT",
    )
    db_session.add(attendance)
    db_session.commit()
    db_session.refresh(attendance)

    # Create breaks: 15 + 60 + 15 minutes
    breaks = [
        Break(
            attendance_id=attendance.id,
            type="MORNING",
            start_time=datetime(2026, 11, 9, 10, 30, 0, tzinfo=timezone.utc),
            end_time=datetime(2026, 11, 9, 10, 45, 0, tzinfo=timezone.utc),
        ),
        Break(
            attendance_id=attendance.id,
            type="LUNCH",
            start_time=datetime(2026, 11, 9, 13, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2026, 11, 9, 14, 0, 0, tzinfo=timezone.utc),
        ),
        Break(
            attendance_id=attendance.id,
            type="EVENING",
            start_time=datetime(2026, 11, 9, 16, 30, 0, tzinfo=timezone.utc),
            end_time=datetime(2026, 11, 9, 16, 45, 0, tzinfo=timezone.utc),
        ),
    ]
    for b in breaks:
        db_session.add(b)
    db_session.commit()

    # Refresh to load breaks relationship
    db_session.refresh(attendance)

    presence, break_min, effective = calculate_durations(attendance)
    assert presence == 540  # 9 hours = 540 minutes
    assert break_min == 90  # 1.5 hours = 90 minutes
    assert effective == 450  # 7.5 hours = 450 minutes


# ---------------------------------------------------------------------------
# Test justify absence
# ---------------------------------------------------------------------------

def test_justify_absence_admin(client, db_session):
    admin = _make_user(db_session, "admin_abs@logicat.ma", "Admin123!", "ADMIN_RH")
    admin_token = _make_token(admin)

    user, employee = _make_employee(db_session, "emp_abs@logicat.ma", "Emp123!")

    # Create unjustified absence
    attendance = Attendance(
        employee_id=employee.id,
        date=date(2026, 11, 8),
        status="ABSENT_UNJUSTIFIED",
    )
    db_session.add(attendance)
    db_session.commit()
    db_session.refresh(attendance)

    # Admin justifies absence
    response = client.patch(
        f"/api/attendances/{attendance.id}/justify",
        json={"justification_note": "Certificat médical fourni"},
        headers=_auth_header(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ABSENT_JUSTIFIED"
    assert data["justification_note"] == "Certificat médical fourni"
