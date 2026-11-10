"""HTTP routes for the applications module (moved verbatim from the Hire-geni API)."""

from __future__ import annotations
from dataclasses import asdict
from typing import Any, Dict, List

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import Application, CVRecord, Job, Notification, User
from app.db.session import get_db
from app.modules.applications.schemas import ApplicationPublic
from app.modules.recruiters.suggestions import REVIEW_THRESHOLD
from app.modules.resume_engine.agents.explainable import PENDING_DECISION
from app.services.access import ensure_not_already_applied
from app.services.agents import score_agent, xai_agent
from app.services.realtime import manager

router = APIRouter()
@router.get("/applications/my", response_model=List[ApplicationPublic])
def list_my_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[ApplicationPublic]:
    apps = db.execute(select(Application).where(Application.user_id == current_user.id)).scalars().all()
    return apps  # type: ignore[return-value]


@router.post("/cv/apply-current")
async def apply_with_current_cv(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Apply to a job using the seeker's most recently uploaded CV."""
    # 1. Fetch latest CV record
    latest_cv = db.execute(
        select(CVRecord)
        .where(CVRecord.user_id == current_user.id)
        .order_by(CVRecord.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    if not latest_cv:
        raise HTTPException(status_code=404, detail="No CV found. Please upload a CV first.")

    # 2. Verify Job exists
    job_obj = db.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()
    if not job_obj:
        raise HTTPException(status_code=404, detail="Job not found.")

    # 3. Check for existing application (the unique index also guards against races, below)
    ensure_not_already_applied(db, job_id, current_user.id)

    # 4. Job-specific match assessment. The AI does not decide: the application stays
    #    "applied" until the recruiter shortlists or rejects it.
    features_for_job = score_agent.score_for_job(latest_cv.extracted, job_obj.required_skills)
    view_mode = latest_cv.toggle_view or "anonymized"
    score = features_for_job.score_breakdown.total
    status = "applied"

    seeker_expl = xai_agent.explain(
        features=features_for_job,
        decision_threshold=REVIEW_THRESHOLD,
        actual_decision=PENDING_DECISION,
        view=view_mode,
        audience="seeker",
        job_title=job_obj.title
    )
    recruiter_expl = xai_agent.explain(
        features=features_for_job,
        decision_threshold=REVIEW_THRESHOLD,
        actual_decision=PENDING_DECISION,
        view=view_mode,
        audience="recruiter",
        job_title=job_obj.title
    )

    from dataclasses import asdict
    app_rec = Application(
        job_id=job_id,
        user_id=current_user.id,
        cv_record_id=latest_cv.id,
        score=score,
        status=status,
        xai_explanation={
            "job_seeker": asdict(seeker_expl),
            "recruiter": asdict(recruiter_expl),
        },
    )
    db.add(app_rec)
    try:
        db.commit()
    except IntegrityError:
        # Lost a race with a concurrent application for the same job.
        db.rollback()
        raise HTTPException(status_code=409, detail="You have already applied for this job.")

    # 5. Persist Notification to DB
    notif = Notification(
        user_id=job_obj.recruiter_id,
        title="New Application",
        message=f"A candidate applied for '{job_obj.title}' using their existing profile.",
        type="success",
        extra_data={"job_id": job_obj.id, "candidate_name": "Existing Candidate"}
    )
    db.add(notif)
    db.commit()

    # 6. Targeted real-time notification
    await manager.send_personal_message({
        "event": "new_application",
        "notif_id": notif.id,
        "data": {
            "job_id": job_obj.id,
            "job_title": job_obj.title,
            "candidate_name": "Existing Candidate"
        }
    }, user_id=job_obj.recruiter_id)

    return {"message": "Application successful", "job_title": job_obj.title}


@router.get("/applications/my")
def get_my_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role.strip().lower() != "seeker":
        raise HTTPException(status_code=403, detail="Only seekers can view their applications")
        
    apps = db.execute(
        select(Application)
        .where(Application.user_id == current_user.id)
        .order_by(Application.created_at.desc())
    ).scalars().all()
    
    out = []
    for app_rec in apps:
        job = db.execute(select(Job).where(Job.id == app_rec.job_id)).scalar_one_or_none()
        cv_rec = db.execute(select(CVRecord).where(CVRecord.id == app_rec.cv_record_id)).scalar_one_or_none()
        
        # Default XAI fields (shown while application is pending)
        reason = "Your application is under review. The recruiter will evaluate your profile shortly."
        decision = "Pending"
        suggestions: list = []
        missing_skills: list = []
        score_breakdown: dict = {}

        # === DATA EXTRACTION (Aggressive Fallback) ===
        raw_xai = app_rec.xai_explanation or {}
        seeker_xai = raw_xai.get("job_seeker", raw_xai) if raw_xai else {}
        
        # 1. Extract Score
        app_score = float(app_rec.score or 0)
        if app_score == 0 and seeker_xai:
            app_score = float(seeker_xai.get("score") or seeker_xai.get("total") or 0)
            
        # 2. Extract Score Breakdown
        score_breakdown = seeker_xai.get("score_breakdown") or seeker_xai.get("breakdown") or {}
        
        # Fallback to CV Record
        if not score_breakdown and cv_rec and cv_rec.scoring:
            cv_s = cv_rec.scoring
            score_breakdown = cv_s.get("score_breakdown") or cv_s.get("breakdown") or {}
            if app_score == 0:
                app_score = float(cv_s.get("score") or cv_s.get("total") or 0)

        # 3. Extract Reason
        reason = seeker_xai.get("reason") or reason
        if not reason or len(reason.strip()) < 5:
            reason = f"Your profile match score is {app_score:.1f}%. "
            if app_score < 70:
                reason += "The AI identified some gaps in required skills or experience for this specific role."
            else:
                reason += "You have a strong profile match. The recruiter will review your detailed experience shortly."

        # 4. Decisions/Suggestions
        suggestions = seeker_xai.get("suggestions") or []
        missing_skills = seeker_xai.get("missing_skills") or []
        if app_rec.status in ("shortlisted", "rejected"):
            decision = seeker_xai.get("decision") or app_rec.status.capitalize()
            
        out.append({
            "id": app_rec.id,
            "job_id": app_rec.job_id,
            "job_title": job.title if job else "Unknown Job",
            "status": app_rec.status,
            "score": float(app_rec.score or 0),
            "decision": decision,
            "reason": reason,
            "suggestions": suggestions,
            "missing_skills": missing_skills,
            "score_breakdown": score_breakdown,
            "reveal_status": app_rec.reveal_status,
            "created_at": app_rec.created_at.isoformat(),
        })
    return out


@router.post("/applications/{app_id}/shortlist")
async def shortlist_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app_rec = db.execute(select(Application).where(Application.id == app_id)).scalar_one_or_none()
    if not app_rec:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Verify job owner
    job = db.execute(select(Job).where(Job.id == app_rec.job_id)).scalar_one_or_none()
    if not job or job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    app_rec.status = "shortlisted"
    
    # Notify Seeker
    notif = Notification(
        user_id=app_rec.user_id,
        title="Congratulations! You've been shortlisted",
        message=f"A recruiter has shortlisted your application for '{job.title}'.",
        type="success",
        extra_data={"app_id": app_id, "job_id": job.id}
    )
    db.add(notif)
    db.commit()
    
    # Broadcast (if UI is listening)
    # Targeted notification for Seeker
    await manager.send_personal_message({
        "event": "notification",
        "notif_id": notif.id,
        "data": {"title": "Shortlisted!", "message": f"Shortlisted for {job.title}"}
    }, user_id=app_rec.user_id)
    
    return {"message": "Candidate shortlisted"}


@router.post("/applications/{app_id}/reject")
async def reject_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app_rec = db.execute(select(Application).where(Application.id == app_id)).scalar_one_or_none()
    if not app_rec:
        raise HTTPException(status_code=404, detail="Application not found")
    
    job = db.execute(select(Job).where(Job.id == app_rec.job_id)).scalar_one_or_none()
    if not job or job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    app_rec.status = "rejected"
    
    # Rewrite the feedback to reflect the recruiter's actual decision, scored against THIS job.
    # (Every application already holds a "Pending" assessment, so this must always run.)
    cv_rec = db.execute(select(CVRecord).where(CVRecord.id == app_rec.cv_record_id)).scalar_one_or_none()
    if cv_rec:
        features = score_agent.score_for_job(cv_rec.extracted, job.required_skills)
        app_rec.xai_explanation = {
            audience_key: asdict(xai_agent.explain(
                features=features,
                decision_threshold=REVIEW_THRESHOLD,
                actual_decision="Rejected",
                view="anonymized",
                audience=audience,
                job_title=job.title,
            ))
            for audience_key, audience in (("job_seeker", "seeker"), ("recruiter", "recruiter"))
        }

    # Notify Seeker
    notif = Notification(
        user_id=app_rec.user_id,
        title="Application Status Updated",
        message=f"The recruiter has completed their review for '{job.title}'. Check your dashboard for feedback.",
        type="info",
        extra_data={"app_id": app_id, "job_id": job.id}
    )
    db.add(notif)
    db.commit()
    
    await manager.send_personal_message({
        "event": "notification",
        "notif_id": notif.id,
        "data": {"title": "Update", "message": f"Application status updated for {job.title}"}
    }, user_id=app_rec.user_id)
    
    return {"message": "Candidate rejected"}


@router.post("/applications/{app_id}/request-reveal")
async def request_reveal(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app_rec = db.execute(select(Application).where(Application.id == app_id)).scalar_one_or_none()
    if not app_rec:
        raise HTTPException(status_code=404, detail="Application not found")
    
    job = db.execute(select(Job).where(Job.id == app_rec.job_id)).scalar_one_or_none()
    if not job or job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if app_rec.reveal_status != "none":
        return {"message": f"Request already in state: {app_rec.reveal_status}"}

    app_rec.reveal_status = "pending"
    
    # Notify Seeker
    notif = Notification(
        user_id=app_rec.user_id,
        title="Identity Reveal Request",
        message=f"A recruiter wants to view your full details for the '{job.title}' position. Do you approve?",
        type="reveal_request",
        extra_data={"app_id": app_id, "job_id": job.id}
    )
    db.add(notif)
    db.commit()

    # Broadcast real-time notification
    # Targeted reveal request notification
    await manager.send_personal_message({
        "event": "notification",
        "notif_id": notif.id,
        "data": {
            "title": notif.title,
            "message": notif.message,
            "type": "reveal_request",
            "extra_data": notif.extra_data
        }
    }, user_id=app_rec.user_id)
    
    return {"message": "Reveal request sent to candidate"}


@router.post("/applications/{app_id}/respond-reveal")
async def respond_reveal(
    app_id: int,
    approved: bool = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app_rec = db.execute(select(Application).where(Application.id == app_id, Application.user_id == current_user.id)).scalar_one_or_none()
    if not app_rec:
        raise HTTPException(status_code=404, detail="Application request not found")

    app_rec.reveal_status = "approved" if approved else "rejected"
    
    # Notify Recruiter
    job = db.execute(select(Job).where(Job.id == app_rec.job_id)).scalar_one_or_none()
    notif = Notification(
        user_id=job.recruiter_id,
        title="Reveal Request Updated",
        message=f"A candidate has {'approved' if approved else 'rejected'} your reveal request for '{job.title}'.",
        type="info",
        extra_data={"app_id": app_id, "approved": approved}
    )
    db.add(notif)
    db.commit()

    # Broadcast real-time notification
    # Targeted response notification for Recruiter
    await manager.send_personal_message({
        "event": "notification",
        "notif_id": notif.id,
        "data": {
            "title": notif.title,
            "message": notif.message,
            "type": "info",
            "extra_data": notif.extra_data
        }
    }, user_id=job.recruiter_id)
    
    return {"message": "Response recorded", "reveal_status": app_rec.reveal_status}


@router.post("/applications/request-reveal-by-cv/{cv_id}")
async def request_reveal_by_cv(
    cv_id: int,
    job_id: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app_rec = db.execute(select(Application).where(Application.cv_record_id == cv_id, Application.job_id == job_id)).scalars().first()
    if not app_rec:
        raise HTTPException(status_code=404, detail="Application not found for this CV and Job")
    
    # Delegate to the existing logic
    return await request_reveal(app_rec.id, current_user, db)
