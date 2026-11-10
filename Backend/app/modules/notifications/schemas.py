"""Request/response schemas for the notifications module."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict

class NotificationPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    title: str
    message: str
    type: str
    read: bool
    extra_data: Optional[Dict[str, Any]] = None
    created_at: datetime
