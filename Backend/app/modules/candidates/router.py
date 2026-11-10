"""HTTP routes for the candidates module (moved verbatim from the Hire-geni API)."""

from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User, UserProfile
from app.db.session import get_db
from app.modules.candidates.schemas import ProfilePayload, ProfileResponse

router = APIRouter()
@router.get("/profile/me", response_model=ProfileResponse)
def get_profile_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    prof = db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id)).scalar_one_or_none()
    if not prof:
        return ProfileResponse(user_id=current_user.id, skills=[], experience=[], education=[])
    return ProfileResponse(
        user_id=current_user.id,
        skills=prof.skills or [],
        experience=prof.experience or [],
        education=prof.education or [],
        phone=prof.phone,
        address=prof.address,
        current_university=prof.current_university
    )


@router.put("/profile/me", response_model=ProfileResponse)
def put_profile_me(
    payload: ProfilePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    prof = db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id)).scalar_one_or_none()
    if not prof:
        prof = UserProfile(user_id=current_user.id, skills=payload.skills, experience=payload.experience, education=payload.education, phone=payload.phone, address=payload.address, current_university=payload.current_university)
        db.add(prof)
    else:
        prof.skills = payload.skills
        prof.experience = payload.experience
        prof.education = payload.education
        prof.phone = payload.phone
        prof.address = payload.address
        prof.current_university = payload.current_university
    db.commit()
    return ProfileResponse(
        user_id=current_user.id,
        skills=payload.skills,
        experience=payload.experience,
        education=payload.education,
        phone=payload.phone,
        address=payload.address,
        current_university=payload.current_university
    )
