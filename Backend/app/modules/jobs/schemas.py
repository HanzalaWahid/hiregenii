"""Request/response schemas for the jobs module."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

class SkillSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    skill: str
    weight: int = 5

    @model_validator(mode='before')
    @classmethod
    def validate_to_dict(cls, data: Any) -> Any:
        if isinstance(data, str):
            return {"skill": data, "weight": 5}
        return data


class JobCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=10)
    experience_level: str = "entry"
    required_skills: List[SkillSchema] = Field(default_factory=list)


class JobPublic(JobCreate):
    id: int
    recruiter_id: int
    created_at: datetime
    company_name: Optional[str] = None
    applicantCount: Optional[int] = 0
