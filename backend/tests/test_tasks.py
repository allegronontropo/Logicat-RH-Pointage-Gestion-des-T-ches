"""
tests/test_tasks.py
--------------------
Day 2 task IDOR and permission tests.

T2/T17: Employee A tries to GET /api/tasks/{id} or PATCH /api/tasks/{id}/status
         for a task assigned to Employee B → 404
T3: Employee sends {"title": "hacked", "status": "DONE"} to
    PATCH /api/tasks/{id}/status → 422 (or title ignored)
"""

from __future__ import annotations

from app.core.security import hash_password, create_access_token
from app.models.user import User
from app.models.employee import Employee
from app.models.task import Task


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
    db_session, email: str, password: str
) -> tuple[User, Employee]:
    user = _make_user(db_session, email, password, "EMPLOYEE")
    employee = Employee(
        user_id=user.id,
        department="IT",
        position="Dev",
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
# T2/T17: Employee A tries to access Employee B's task → 404
# ---------------------------------------------------------------------------

def test_employee_access_another_task_by_id(client, db_session):
    user_a, emp_a = _make_employee(db_session, "emp_a@logicat.ma", "Emp123!")
    user_b, emp_b = _make_employee(db_session, "emp_b@logicat.ma", "Emp123!")

    admin = _make_user(db_session, "admin@logicat.ma", "Admin123!", "ADMIN_RH")

    task = Task(
        title="Test Task",
        description=None,
        priority="MEDIUM",
        status="TODO",
        due_date=None,
        assigned_to=emp_a.id,
        created_by=admin.id,
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    # Employee B tries to get Employee A's task
    token_b = _make_token(user_b)
    response = client.get(
        f"/api/tasks/{task.id}", headers=_auth_header(token_b)
    )
    assert response.status_code == 404


def test_employee_update_another_task_status(client, db_session):
    user_a, emp_a = _make_employee(db_session, "emp_a@logicat.ma", "Emp123!")
    user_b, emp_b = _make_employee(db_session, "emp_b@logicat.ma", "Emp123!")

    admin = _make_user(db_session, "admin@logicat.ma", "Admin123!", "ADMIN_RH")

    task = Task(
        title="Test Task",
        description=None,
        priority="MEDIUM",
        status="TODO",
        due_date=None,
        assigned_to=emp_a.id,
        created_by=admin.id,
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    # Employee B tries to update Employee A's task status
    token_b = _make_token(user_b)
    response = client.patch(
        f"/api/tasks/{task.id}/status",
        json={"status": "DONE"},
        headers=_auth_header(token_b),
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# T3: Employee sends extra fields to status update → 422 or ignored
# ---------------------------------------------------------------------------

def test_employee_status_update_ignores_extra_fields(client, db_session):
    user, employee = _make_employee(db_session, "emp@logicat.ma", "Emp123!")
    token = _make_token(user)

    admin = _make_user(db_session, "admin@logicat.ma", "Admin123!", "ADMIN_RH")

    task = Task(
        title="Test Task",
        description=None,
        priority="MEDIUM",
        status="TODO",
        due_date=None,
        assigned_to=employee.id,
        created_by=admin.id,
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    # Send extra field "title" which is not in TaskStatusUpdate schema
    response = client.patch(
        f"/api/tasks/{task.id}/status",
        json={"title": "hacked", "status": "DONE"},
        headers=_auth_header(token),
    )
    # Either 422 (validation rejects extra field) or title is ignored (200)
    assert response.status_code in (200, 422)
    if response.status_code == 200:
        data = response.json()
        assert data["title"] == "Test Task"  # title was ignored
        assert data["status"] == "DONE"
