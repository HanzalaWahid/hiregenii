"""Authorization and status helpers shared by several modules."""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Application, Job, User
from app.modules.resume_engine.agents.explainable import PENDING_DECISION


def require_recruiter(user: User) -> None:
    if (user.role or "").strip().lower() != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can perform this action")


def get_owned_job(db: Session, job_id: int, user: User) -> Job:
    """Return the job if it exists and belongs to the calling recruiter, else 404/403."""
    require_recruiter(user)
    job = db.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.recruiter_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this job")
    return job


_STATUS_DECISION_LABELS = {"shortlisted": "Shortlisted", "rejected": "Rejected"}


def decision_label(status: Optional[str]) -> str:
    """Map an application status (set only by a recruiter) to the label shown in explanations."""
    return _STATUS_DECISION_LABELS.get((status or "").lower(), PENDING_DECISION)


def ensure_not_already_applied(db: Session, job_id: int, user_id: int) -> None:
    existing = db.execute(
        select(Application.id).where(Application.job_id == job_id, Application.user_id == user_id)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied for this job.")
