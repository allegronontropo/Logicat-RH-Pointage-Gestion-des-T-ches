"""
app/routers/tasks.py
--------------------
Task endpoints — mixed roles.

Admin:
  POST   /api/tasks                         Create + assign a task
  GET    /api/tasks                         List all tasks (filters: ?assigned_to=, ?priority=, ?status=, ?is_late=)
  PUT    /api/tasks/{id}                    Full update
  DELETE /api/tasks/{id}                    Delete

Employee:
  GET    /api/tasks/me                      Own assigned tasks only
  GET    /api/tasks/{id}                    Own task by ID (404 if not owner)
  PATCH  /api/tasks/{id}/status             Update status only (TODO|IN_PROGRESS|DONE, owner only)
"""

from __future__ import annotations

from typing import Annotated
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_employee, get_current_user, require_admin, get_db
from app.models.task import Task
from app.models.employee import Employee
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskResponse

# Helper: load task with employee + user for name display
def _load_task_with_assignee(db: Session, task_id: int) -> Task | None:
    return (
        db.query(Task)
        .options(
            joinedload(Task.employee).joinedload(Employee.user)
        )
        .filter(Task.id == task_id)
        .first()
    )

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=TaskResponse, include_in_schema=False, status_code=status.HTTP_201_CREATED)
@router.post(
    "/",
    response_model=TaskResponse,
    summary="Create task",
    description="Admin creates and assigns a task to an employee.",
    status_code=status.HTTP_201_CREATED,
)
def create_task_endpoint(
    task_data: TaskCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> TaskResponse:
    # Verify assigned_to employee exists
    employee = db.query(Employee).filter(Employee.id == task_data.assigned_to).first()
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned employee not found",
        )

    task = Task(
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority,
        status="TODO",
        due_date=task_data.due_date,
        assigned_to=task_data.assigned_to,
        created_by=current_user.id,
    )
    db.add(task)
    db.commit()
    # Reload with assignee join so the response includes the employee's name
    task = _load_task_with_assignee(db, task.id)
    return TaskResponse.from_orm_with_assignee(task)


@router.get("", response_model=list[TaskResponse], include_in_schema=False)
@router.get(
    "/",
    response_model=list[TaskResponse],
    summary="List all tasks",
    description="Admin: list all tasks with optional filters.",
)
def list_tasks_admin(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    assigned_to: int | None = Query(default=None, description="Filter by employee ID"),
    priority: str | None = Query(default=None, description="Filter by priority"),
    status: str | None = Query(default=None, description="Filter by status"),
    is_late: bool | None = Query(
        default=None,
        description=(
            "Filter late tasks: due_date < today AND status != DONE. "
            "True = only late tasks, False = only non-late tasks."
        ),
    ),
) -> list[TaskResponse]:
    query = db.query(Task).options(
        joinedload(Task.employee).joinedload(Employee.user)
    )

    if assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)
    if priority:
        query = query.filter(Task.priority == priority)
    if status:
        query = query.filter(Task.status == status)
    if is_late is True:
        query = query.filter(
            Task.due_date < func.current_date(),
            Task.status != "DONE",
        )
    elif is_late is False:
        # NOT late = no due date, due today/future, or already done.
        query = query.filter(
            or_(
                Task.due_date.is_(None),
                Task.due_date >= func.current_date(),
                Task.status == "DONE",
            )
        )

    tasks = query.order_by(Task.id.desc()).all()
    return [TaskResponse.from_orm_with_assignee(t) for t in tasks]


@router.put(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Update task",
    description="Admin fully updates a task.",
)
def update_task_endpoint(
    task_id: int,
    task_data: TaskUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> TaskResponse:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    update_dict = task_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(task, field, value)

    db.commit()
    # Reload with assignee join so the response includes the employee's name
    task = _load_task_with_assignee(db, task.id)
    return TaskResponse.from_orm_with_assignee(task)


@router.delete(
    "/{task_id}",
    summary="Delete task",
    description="Admin deletes a task.",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task_endpoint(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> None:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    db.delete(task)
    db.commit()


# ---------------------------------------------------------------------------
# Employee endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=list[TaskResponse],
    summary="Get my tasks",
    description="Employee: view only own assigned tasks.",
)
def get_my_tasks(
    db: Annotated[Session, Depends(get_db)],
    current_employee: Annotated[Employee, Depends(get_current_employee)],
    priority: str | None = Query(default=None, description="Filter by priority"),
    status: str | None = Query(default=None, description="Filter by status"),
) -> list[TaskResponse]:
    query = db.query(Task).options(
        joinedload(Task.employee).joinedload(Employee.user)
    ).filter(Task.assigned_to == current_employee.id)

    if priority:
        query = query.filter(Task.priority == priority)
    if status:
        query = query.filter(Task.status == status)

    tasks = query.order_by(Task.id.desc()).all()
    return [TaskResponse.from_orm_with_assignee(t) for t in tasks]


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Get task by ID",
    description="Employee: view own task by ID. Returns 404 if not the owner.",
)
def get_task_by_id_employee(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_employee: Annotated[Employee, Depends(get_current_employee)],
) -> TaskResponse:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    # IDOR: employee can only see their own tasks
    if task.assigned_to != current_employee.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    task = _load_task_with_assignee(db, task.id)
    return TaskResponse.from_orm_with_assignee(task)


@router.patch(
    "/{task_id}/status",
    response_model=TaskResponse,
    summary="Update task status",
    description="Employee: update only the status of an owned task. Other fields are ignored.",
)
def update_task_status_endpoint(
    task_id: int,
    status_data: TaskStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_employee: Annotated[Employee, Depends(get_current_employee)],
) -> TaskResponse:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    # IDOR: employee can only update their own tasks
    if task.assigned_to != current_employee.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    task.status = status_data.status
    db.commit()
    task = _load_task_with_assignee(db, task.id)
    return TaskResponse.from_orm_with_assignee(task)
