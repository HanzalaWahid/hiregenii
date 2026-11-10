"""Request/response schemas for the auth module."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.recruiters.schemas import RecruiterProfilePublic

class RegisterRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["seeker", "recruiter"]


class LoginRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    role: Literal["seeker", "recruiter"]
    recruiter_profile: Optional[RecruiterProfilePublic] = None


class RegisterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user: UserPublic
    access_token: str
    token_type: str = "bearer"
