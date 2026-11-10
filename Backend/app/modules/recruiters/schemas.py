"""Request/response schemas for the recruiters module."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

class RecruiterProfilePayload(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    company_name: str = Field(min_length=2, max_length=200)
    company_website: Optional[str] = None
    location: str = Field(min_length=2, max_length=200)
    industry: Optional[str] = None
    company_description: Optional[str] = None


class RecruiterProfilePublic(RecruiterProfilePayload):
    id: int
    user_id: int
