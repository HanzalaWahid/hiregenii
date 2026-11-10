"""Request/response schemas for the applications module."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

class ApplicationPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_id: int
    user_id: int
    cv_record_id: int
    score: float
    status: str
    reveal_status: str
    created_at: datetime
    job_title: Optional[str] = None
    candidate_name: Optional[str] = None
    candidate_company: Optional[str] = None
