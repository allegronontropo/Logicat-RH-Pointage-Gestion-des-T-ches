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

from datetime import datetime, date, time, timedelta, timezone

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


def test_calculate_durations_caps_open_attendance_at_expected_end(db_session):
    _, employee = _make_employee(db_session, "emp_open_shift@logicat.ma", "Emp123!")
    yesterday = date.today() - timedelta(days=1)
    attendance = Attendance(
        employee_id=employee.id,
        date=yesterday,
        check_in=datetime.combine(yesterday, time(9, 0), tzinfo=timezone.utc),
        check_out=None,
        status="PRESENT",
    )
    db_session.add(attendance)
    db_session.commit()
    db_session.refresh(attendance)

    presence, break_min, effective = calculate_durations(attendance)

    assert presence == 540
    assert break_min == 0
    assert effective == 540


def test_calculate_durations_clamps_both_ends_to_custom_schedule(db_session):
    _, employee = _make_employee(db_session, "emp_custom_shift@logicat.ma", "Emp123!")
    employee.expected_start_time = time(10, 0)
    employee.expected_end_time = time(17, 0)
    shift_date = date(2026, 11, 9)
    attendance = Attendance(
        employee_id=employee.id,
        date=shift_date,
        check_in=datetime(2026, 11, 9, 8, 0, tzinfo=timezone.utc),
        check_out=datetime(2026, 11, 9, 20, 0, tzinfo=timezone.utc),
        status="PRESENT",
    )
    db_session.add(attendance)
    db_session.commit()
    db_session.refresh(attendance)

    presence, break_min, effective = calculate_durations(attendance)

    assert presence == 420
    assert break_min == 0
    assert effective == 420


def test_calculate_durations_clamps_open_break_at_expected_end():
    employee = Employee(
        id=1,
        user_id=1,
        expected_start_time=time(10, 0),
        expected_end_time=time(17, 0),
    )
    attendance = Attendance(
        employee=employee,
        date=date(2026, 11, 9),
        check_in=datetime(2026, 11, 9, 10, 0, tzinfo=timezone.utc),
        check_out=datetime(2026, 11, 9, 18, 0, tzinfo=timezone.utc),
        status="PRESENT",
    )
    attendance.breaks = [
        Break(
            attendance_id=1,
            type="LUNCH",
            start_time=datetime(2026, 11, 9, 16, 50, tzinfo=timezone.utc),
            end_time=None,
        )
    ]

    presence, break_min, effective = calculate_durations(attendance)

    assert presence == 420
    assert break_min == 10
    assert effective == 410


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


# ---------------------------------------------------------------------------
# Multi-Day Absence Tests
# ---------------------------------------------------------------------------

def test_declare_multiday_absence_admin(client, db_session):
    admin = _make_user(db_session, "admin_multi@logicat.ma", "Admin123!", "ADMIN_RH")
    admin_token = _make_token(admin)
    user, employee = _make_employee(db_session, "emp_multi@logicat.ma", "Emp123!")

    # Declare 3-day absence
    response = client.post(
        "/api/attendances/absences",
        json={
            "employee_id": employee.id,
            "start_date": "2026-11-10",
            "end_date": "2026-11-12",
            "status": "ABSENT_JUSTIFIED",
            "justification_note": "Congé annuel approuvé",
        },
        headers=_auth_header(admin_token),
    )
    assert response.status_code == 201
    records = response.json()
    assert isinstance(records, list)
    assert len(records) == 3
    dates = [r["date"] for r in records]
    assert dates == ["2026-11-10", "2026-11-11", "2026-11-12"]
    for r in records:
        assert r["status"] == "ABSENT_JUSTIFIED"
        assert r["justification_note"] == "Congé annuel approuvé"


def test_declare_multiday_absence_skips_present_without_crash(client, db_session):
    admin = _make_user(db_session, "admin_skip@logicat.ma", "Admin123!", "ADMIN_RH")
    admin_token = _make_token(admin)
    user, employee = _make_employee(db_session, "emp_skip@logicat.ma", "Emp123!")

    # Middle day is already PRESENT
    existing_att = Attendance(
        employee_id=employee.id,
        date=date(2026, 11, 11),
        status="PRESENT",
    )
    db_session.add(existing_att)
    db_session.commit()

    # Declare absence for 2026-11-10 to 2026-11-12 without override
    response = client.post(
        "/api/attendances/absences",
        json={
            "employee_id": employee.id,
            "start_date": "2026-11-10",
            "end_date": "2026-11-12",
            "status": "ABSENT_UNJUSTIFIED",
            "override": False,
        },
        headers=_auth_header(admin_token),
    )
    assert response.status_code == 201
    records = response.json()
    # Records returned should only be the ones updated/created (2026-11-10 and 2026-11-12)
    assert len(records) == 2
    dates = [r["date"] for r in records]
    assert "2026-11-11" not in dates

    # Check that 2026-11-11 is still PRESENT
    db_session.refresh(existing_att)
    assert existing_att.status == "PRESENT"


def test_declare_multiday_absence_invalid_dates(client, db_session):
    admin = _make_user(db_session, "admin_bad_date@logicat.ma", "Admin123!", "ADMIN_RH")
    admin_token = _make_token(admin)
    user, employee = _make_employee(db_session, "emp_bad_date@logicat.ma", "Emp123!")

    # start_date > end_date
    response = client.post(
        "/api/attendances/absences",
        json={
            "employee_id": employee.id,
            "start_date": "2026-11-15",
            "end_date": "2026-11-10",
            "status": "ABSENT_JUSTIFIED",
        },
        headers=_auth_header(admin_token),
    )
    assert response.status_code in (400, 422)


def test_export_employee_attendance_csv(client, db_session):
    admin = _make_user(db_session, "admin_export@logicat.ma", "Admin123!", "ADMIN_RH")
    admin_token = _make_token(admin)
    user, employee = _make_employee(db_session, "emp_export@logicat.ma", "Emp123!")
    emp_token = _make_token(user)

    # Create an attendance record
    att = Attendance(
        employee_id=employee.id,
        date=date(2026, 11, 1),
        check_in=datetime(2026, 11, 1, 9, 0, 0, tzinfo=timezone.utc),
        check_out=datetime(2026, 11, 1, 18, 0, 0, tzinfo=timezone.utc),
        status="PRESENT",
    )
    db_session.add(att)
    db_session.commit()

    # Admin request
    resp = client.get(
        f"/api/attendances/export/{employee.id}",
        headers=_auth_header(admin_token),
    )
    assert resp.status_code == 200
    assert "text/csv" in resp.headers.get("content-type", "")
    assert "attachment; filename=attendance.csv" in resp.headers.get("content-disposition", "")
    content = resp.text
    assert "Date,Check-in,Check-out,Total Breaks,Effective Hours,Status" in content
    assert "2026-11-01" in content
    assert "PRESENT" in content

    # Non-admin request should be forbidden
    resp_emp = client.get(
        f"/api/attendances/export/{employee.id}",
        headers=_auth_header(emp_token),
    )
    assert resp_emp.status_code == 403


def test_calculate_durations_clamped_to_zero():
    att = Attendance(
        employee_id=1,
        date=date(2026, 11, 1),
        check_in=datetime(2026, 11, 1, 9, 0, 0, tzinfo=timezone.utc),
        check_out=datetime(2026, 11, 1, 9, 10, 0, tzinfo=timezone.utc),
        status="PRESENT",
    )
    b1 = Break(
        attendance_id=1,
        type="LUNCH",
        start_time=datetime(2026, 11, 1, 9, 0, 0, tzinfo=timezone.utc),
        end_time=datetime(2026, 11, 1, 9, 18, 0, tzinfo=timezone.utc),
    )
    att.breaks = [b1]
    presence, breaks, effective = calculate_durations(att)
    assert presence == 10
    assert breaks == 18
    assert effective == 0


