"""
app/schemas/task.py
-------------------
Pydantic schemas for task management.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    """Request body for POST /api/tasks (admin creates a task)."""

    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    priority: str = Field(default="MEDIUM", description="LOW | MEDIUM | HIGH")
    due_date: date | None = None
    assigned_to: int = Field(..., description="Employee ID to assign the task to")


class TaskUpdate(BaseModel):
    """Request body for PUT /api/tasks/{id} (admin updates a task)."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    priority: str | None = Field(default=None, description="LOW | MEDIUM | HIGH")
    status: str | None = Field(default=None, description="TODO | IN_PROGRESS | DONE")
    due_date: date | None = None
    assigned_to: int | None = None


class TaskStatusUpdate(BaseModel):
    """Request body for PATCH /api/tasks/{id}/status (employee updates own task status).

    Only the `status` field is allowed — enforced by the schema itself.
    """

    status: str = Field(..., description="TODO | IN_PROGRESS | DONE")


class AssigneeRead(BaseModel):
    """Nested assignee info embedded in TaskResponse.

    Derived from the Employee → User join so the frontend can display names
    without a second API call.
    """

    employee_id: int
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class TaskResponse(BaseModel):
    """Response body for task endpoints.

    Includes nested ``assignee`` with the employee's name so the frontend
    admin table can display "Youssef Badri" instead of a raw integer ID.
    """

    id: int
    title: str
    description: str | None = None
    priority: str
    status: str
    due_date: date | None = None
    assigned_to: int
    assignee: AssigneeRead | None = None  # nested name for UI display
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_assignee(cls, task: "Task") -> "TaskResponse":  # type: ignore[name-defined]
        """Build a TaskResponse that includes the assignee's name.

        Requires the Task ORM object to have its ``employee`` relationship
        loaded (use ``joinedload(Task.employee).joinedload(Employee.user)``).
        """
        assignee: AssigneeRead | None = None
        if task.employee and task.employee.user:
            assignee = AssigneeRead(
                employee_id=task.employee.id,
                first_name=task.employee.user.first_name,
                last_name=task.employee.user.last_name,
            )
        return cls(
            id=task.id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            status=task.status,
            due_date=task.due_date,
            assigned_to=task.assigned_to,
            assignee=assignee,
            created_by=task.created_by,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )
