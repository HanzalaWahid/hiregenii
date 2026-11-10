"""Request/response schemas for the resumes module."""

from __future__ import annotations

from typing import Any, Dict, List, Literal

from pydantic import BaseModel, ConfigDict

class CvLatestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    candidate_id: int
    toggle_view: Literal["normal", "anonymized"]
    cv: Dict[str, Any]
    extracted: Dict[str, Any]
    scoring: Dict[str, Any]
    explanations: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
