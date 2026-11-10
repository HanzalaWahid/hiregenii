"""Request/response schemas for the candidates module."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

class ProfilePayload(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    skills: List[Dict[str, Any]] = Field(default_factory=list)
    experience: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    phone: Optional[str] = None
    address: Optional[str] = None
    current_university: Optional[str] = None


class ProfileResponse(ProfilePayload):
    user_id: int
