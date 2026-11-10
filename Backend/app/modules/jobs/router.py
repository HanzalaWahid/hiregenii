"""HTTP routes for the jobs module (moved verbatim from the Hire-geni API)."""

from __future__ import annotations
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import Application, Job, RecruiterProfile, User
from app.db.session import get_db
from app.modules.jobs.schemas import JobCreate, JobPublic
from app.services.realtime import manager

router = APIRouter()
@router.get("/jobs", response_model=List[JobPublic])
def list_jobs(db: Session = Depends(get_db)) -> List[JobPublic]:
    # Join with RecruiterProfile to get company names
    jobs_with_companies = db.execute(
        select(Job, RecruiterProfile.company_name)
        .outerjoin(RecruiterProfile, Job.recruiter_id == RecruiterProfile.user_id)
    ).all()
    
    out = []
    for job, company in jobs_with_companies:
        app_count = db.execute(select(func.count(Application.id)).where(Application.job_id == job.id)).scalar()
        jp = JobPublic.model_validate(job)
        jp.applicantCount = app_count
        jp.company_name = company or "Independent Recruiter"
        out.append(jp)
    return out


@router.get("/jobs/my", response_model=List[JobPublic])
def list_my_jobs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[JobPublic]:
    if current_user.role.strip().lower() != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can view their own jobs")
    
    jobs_with_companies = db.execute(
        select(Job, RecruiterProfile.company_name)
        .outerjoin(RecruiterProfile, Job.recruiter_id == RecruiterProfile.user_id)
        .where(Job.recruiter_id == current_user.id)
    ).all()
    
    out = []
    for job, company in jobs_with_companies:
        count = db.execute(select(func.count(Application.id)).where(Application.job_id == job.id)).scalar() or 0
        jp = JobPublic.model_validate(job)
        jp.applicantCount = count
        jp.company_name = company or "Independent Recruiter"
        out.append(jp)
    return out


@router.post("/jobs", response_model=JobPublic)
async def create_job(
    payload: JobCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
) -> JobPublic:
    print(f"DEBUG: Attempting to post job. User: {current_user.email}, Role: '{current_user.role}'")
    print(f"DEBUG: Payload received: {payload.model_dump()}")
    
    if current_user.role.strip().lower() != "recruiter":
        print(f"DEBUG: Access denied. Role '{current_user.role}' is not 'recruiter'")
        raise HTTPException(status_code=403, detail="Only recruiters can post jobs")
    
    # Check if recruiter has a profile
    prof = db.execute(select(RecruiterProfile).where(RecruiterProfile.user_id == current_user.id)).scalar_one_or_none()
    if not prof:
        raise HTTPException(
            status_code=403, 
            detail="Please complete your company profile before posting a job."
        )
    
    # Masla yahan solve hoga: Objects ko dictionaries mein convert karein
    # Pydantic v2 use kar rahe hain to .model_dump(), v1 hai to .dict()
    skills_as_dicts = [skill.model_dump() for skill in payload.required_skills]

    job = Job(
        recruiter_id=current_user.id,
        title=payload.title,
        description=payload.description,
        experience_level=payload.experience_level,
        required_skills=skills_as_dicts, # Ab ye save ho jayega
    )

    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Real-time update: Poora job data bhej dein takay seeker ko foran nazar aaye
    # Real-time update: Broadcast ONLY to seekers
    await manager.broadcast_to_role({
        "event": "new_job",
        "data": {
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "experience_level": job.experience_level,
            "required_skills": skills_as_dicts,
            "recruiter_id": job.recruiter_id,
            "created_at": job.created_at.isoformat()
        }
    }, role="seeker", db_session=db)
    
    return job  # type: ignore[return-value]


@router.get("/jobs/{job_id}", response_model=JobPublic)
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobPublic:
    job = db.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job  # type: ignore[return-value]
