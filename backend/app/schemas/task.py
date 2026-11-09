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
    due_date: date | None = None
    assigned_to: int | None = None


class TaskStatusUpdate(BaseModel):
    """Request body for PATCH /api/tasks/{id}/status (employee updates own task status).

    Only the `status` field is allowed — enforced by the schema itself.
    """

    status: str = Field(..., description="TODO | IN_PROGRESS | DONE")


class TaskResponse(BaseModel):
    """Response body for task endpoints."""

    id: int
    title: str
    description: str | None = None
    priority: str
    status: str
    due_date: date | None = None
    assigned_to: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
