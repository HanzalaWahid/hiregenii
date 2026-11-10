"""Request/response schemas for the interviews module."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

class InterviewCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    job_id: int
    user_id: int
    scheduled_at: datetime
    meeting_link: Optional[str] = None


class InterviewPublic(InterviewCreate):
    id: int
    status: str
    created_at: datetime
    job_title: Optional[str] = None
    company_name: Optional[str] = None
