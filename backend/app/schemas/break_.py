"""
app/schemas/break_.py
---------------------
Pydantic schemas for breaks.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class BreakStartRequest(BaseModel):
    """Request body for POST /api/breaks/start."""

    type: str = Field(..., description="Break type: MORNING, LUNCH, or EVENING")


class BreakResponse(BaseModel):
    """Response body for break endpoints."""

    id: int
    attendance_id: int
    type: str
    start_time: datetime
    end_time: datetime | None = None

    model_config = {"from_attributes": True}
