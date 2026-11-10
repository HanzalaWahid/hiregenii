"""HTTP routes for the interviews module (moved verbatim from the Hire-geni API)."""

from __future__ import annotations
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import Application, Interview, Job, Notification, RecruiterProfile, User
from app.db.session import get_db
from app.modules.interviews.schemas import InterviewCreate, InterviewPublic
from app.services.access import get_owned_job
from app.services.realtime import manager

router = APIRouter()
@router.post("/interviews", response_model=InterviewPublic)
async def schedule_interview(
    payload: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = get_owned_job(db, payload.job_id, current_user)

    # The invitee must actually be an applicant to this job.
    has_applied = db.execute(
        select(Application.id).where(Application.job_id == job.id, Application.user_id == payload.user_id)
    ).first()
    if not has_applied:
        raise HTTPException(status_code=404, detail="No application from this candidate for this job")

    interview = Interview(**payload.model_dump())
    db.add(interview)
    db.flush()  # assign interview.id for the notification payload

    # Notify Seeker
    notif = Notification(
        user_id=payload.user_id,
        title="New Interview Scheduled",
        message=f"An interview has been scheduled for '{job.title}' on {payload.scheduled_at.strftime('%Y-%m-%d %H:%M')}.",
        type="info",
        extra_data={"job_id": job.id, "interview_id": interview.id}
    )
    db.add(notif)
    db.commit()
    db.refresh(interview)
    
    # Real-time notification
    await manager.send_personal_message({
        "event": "notification",
        "notif_id": notif.id,
        "data": {"title": "Interview Scheduled", "message": f"New interview for {job.title}"}
    }, user_id=payload.user_id)
    
    return interview


@router.get("/interviews/my", response_model=List[InterviewPublic])
def get_my_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    interviews = db.execute(
        select(Interview, Job.title, RecruiterProfile.company_name)
        .join(Job, Interview.job_id == Job.id)
        .outerjoin(RecruiterProfile, Job.recruiter_id == RecruiterProfile.user_id)
        .where(Interview.user_id == current_user.id)
        .order_by(Interview.scheduled_at.asc())
    ).all()
    
    out = []
    for inter, title, company in interviews:
        p = InterviewPublic.model_validate(inter)
        p.job_title = title
        p.company_name = company or "Independent Recruiter"
        out.append(p)
    return out


@router.get("/interviews/recruiter", response_model=List[InterviewPublic])
def get_recruiter_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    interviews = db.execute(
        select(Interview, Job.title, User.full_name)
        .join(Job, Interview.job_id == Job.id)
        .join(User, Interview.user_id == User.id)
        .where(Job.recruiter_id == current_user.id)
        .order_by(Interview.scheduled_at.asc())
    ).all()
    
    out = []
    for inter, title, candidate_name in interviews:
        p = InterviewPublic.model_validate(inter)
        p.job_title = title
        p.company_name = candidate_name # Candidate name instead of company
        out.append(p)
    return out
