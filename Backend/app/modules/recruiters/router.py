"""HTTP routes for the recruiters module (moved verbatim from the Hire-geni API)."""

from __future__ import annotations

import os
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import DATA_DIR
from app.core.deps import get_current_user
from app.db.models import Application, CVRecord, Job, Notification, RecruiterProfile, User
from app.db.session import get_db
from app.modules.recruiters.schemas import RecruiterProfilePayload, RecruiterProfilePublic
from app.modules.recruiters.suggestions import REVIEW_THRESHOLD, ShortlistSuggestionService
from app.modules.resume_engine.agents.ranking import RankedCandidate
from app.modules.resume_engine.agents.scoring import FeatureResult
from app.services.access import get_owned_job
from app.services.agents import rank_agent, score_agent, xai_agent
from app.services.cache import set_cached_result
from app.services.realtime import manager

router = APIRouter()
@router.get("/profile/recruiter", response_model=RecruiterProfilePublic)
def get_recruiter_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecruiterProfilePublic:
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters have recruiter profiles")
    prof = db.execute(select(RecruiterProfile).where(RecruiterProfile.user_id == current_user.id)).scalar_one_or_none()
    if not prof:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    return prof


@router.put("/profile/recruiter", response_model=RecruiterProfilePublic)
def put_recruiter_profile(
    payload: RecruiterProfilePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecruiterProfilePublic:
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can have recruiter profiles")
    
    prof = db.execute(select(RecruiterProfile).where(RecruiterProfile.user_id == current_user.id)).scalar_one_or_none()
    if not prof:
        prof = RecruiterProfile(user_id=current_user.id, **payload.model_dump())
        db.add(prof)
    else:
        for key, value in payload.model_dump().items():
            setattr(prof, key, value)
    db.commit()
    db.refresh(prof)
    return prof


@router.get("/bias-toggle/{candidate_id}")
def bias_toggle(
    candidate_id: int,
    job_id: int = 1,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Mandatory output format for frontend toggle comparison.
    Returns normal_view vs anonymized_view and highlights bias impact.
    Visible to the CV owner, or to the recruiter who owns `job_id` when the CV applied to it.
    """
    cv_rec = db.execute(select(CVRecord).where(CVRecord.id == candidate_id)).scalar_one_or_none()
    if not cv_rec:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if cv_rec.user_id == current_user.id:
        job_obj = db.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()
        if not job_obj:
            raise HTTPException(status_code=404, detail="Job not found")
    else:
        job_obj = get_owned_job(db, job_id, current_user)
        applied = db.execute(
            select(Application.id).where(Application.job_id == job_id, Application.cv_record_id == cv_rec.id)
        ).first()
        if not applied:
            raise HTTPException(status_code=404, detail="Candidate not found")

    parsed = cv_rec.extracted

    # normal view includes institute + bias adjustment
    features_normal = score_agent.extract_and_score(
        cv_skills=parsed.get("skills", []),
        experience_years=float(parsed.get("experience_years", 0.0)),
        projects_count=int(parsed.get("projects_count", 0)),
        certifications_count=int(parsed.get("certifications_count", 0)),
        cgpa=parsed.get("cgpa", None),
        institute=parsed.get("education_institute", None),
        job_required_skills=job_obj.required_skills,
        include_institute_bias=True,
    )

    # anonymized view removes institute + no bias adjustment
    features_fair = score_agent.extract_and_score(
        cv_skills=parsed.get("skills", []),
        experience_years=float(parsed.get("experience_years", 0.0)),
        projects_count=int(parsed.get("projects_count", 0)),
        certifications_count=int(parsed.get("certifications_count", 0)),
        cgpa=parsed.get("cgpa", None),
        institute=None,
        job_required_skills=job_obj.required_skills,
        include_institute_bias=False,
    )

    # What-if demo only: compares hypothetical threshold outcomes with and without institute
    # bias. Nothing here is stored or changes any application.
    threshold = REVIEW_THRESHOLD
    _btitle = job_obj.title if job_obj else None

    def _hypothetical(features: FeatureResult) -> str:
        return "Selected" if features.score_breakdown.total >= threshold else "Rejected"

    expl_normal = xai_agent.explain(features=features_normal, decision_threshold=threshold, actual_decision=_hypothetical(features_normal), view="normal", audience="recruiter", job_title=_btitle)
    expl_fair = xai_agent.explain(features=features_fair, decision_threshold=threshold, actual_decision=_hypothetical(features_fair), view="anonymized", audience="recruiter", job_title=_btitle)

    bias_detected = bool(expl_normal.bias_indicator and (expl_normal.decision != expl_fair.decision or abs(features_normal.score_breakdown.institute_bias) >= 4))
    key_insight = "Educational institute influenced decision in original model" if bias_detected else "No significant institute-driven bias detected"

    # Required schema (exact top-level keys)
    return {
        "candidate_id": candidate_id,
        "normal_view": {
            "decision": expl_normal.decision,
            "score": int(round(expl_normal.score)),
            "reason": expl_normal.bias_insight or expl_normal.reason,
        },
        "anonymized_view": {
            "decision": expl_fair.decision,
            "score": int(round(expl_fair.score)),
            "reason": expl_fair.reason,
        },
        "bias_detected": bias_detected,
        "key_insight": key_insight,
        # extra explainability (still JSON, safe for frontend to ignore)
        "explainability": {
            "normal": expl_normal.__dict__,
            "anonymized": expl_fair.__dict__,
        },
    }


@router.get("/rank/{job_id}")
def rank_candidates(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    job_obj = get_owned_job(db, job_id, current_user)

    applications = db.execute(select(Application).where(Application.job_id == job_id)).scalars().all()
    
    ranked = []
    for app in applications:
        cv_rec = db.execute(select(CVRecord).where(CVRecord.id == app.cv_record_id)).scalar_one_or_none()
        if not cv_rec:
            continue
        parsed = cv_rec.extracted
        features = score_agent.extract_and_score(
            cv_skills=parsed.get("skills", []),
            experience_years=float(parsed.get("experience_years", 0.0)),
            projects_count=int(parsed.get("projects_count", 0)),
            certifications_count=int(parsed.get("certifications_count", 0)),
            cgpa=parsed.get("cgpa", None),
            institute=parsed.get("education_institute", None),
            job_required_skills=job_obj.required_skills,
            # Institute prestige must never influence ranking.
            include_institute_bias=False,
        )
        ranked.append({"candidate_id": cv_rec.id, "score": features.score_breakdown.total})

    top = rank_agent.rank_top_k(
        candidates=[RankedCandidate(candidate_id=r["candidate_id"], score=r["score"]) for r in ranked],
        k=50,
    )
    top_out = []
    for c in top:
        cv_rec = db.execute(select(CVRecord).where(CVRecord.id == c.candidate_id)).scalar_one_or_none()
        if not cv_rec:
            continue
            
        app = db.execute(select(Application).where(Application.job_id == job_id, Application.cv_record_id == cv_rec.id)).scalars().first()
        is_shortlisted = app.status == "shortlisted" if app else False
        
        top_out.append({
            "id": app.id if app else None,
            "candidate_id": str(c.candidate_id),
            "score": float(round(c.score, 2)),
            "experience_years": cv_rec.extracted.get("experience_years", 0),
            "skills": cv_rec.extracted.get("skills", [])[:3], # top 3 skills
            "education_level": f"CGPA: {cv_rec.extracted.get('cgpa', 'N/A')}",
            "isShortlisted": is_shortlisted,
            "status": app.status if app else "applied",
            "company": cv_rec.extracted.get("last_company", "N/A"),
        })
    
    res_data = {"job_id": job_id, "top_5": top_out}
    app_count = db.execute(select(func.count(Application.id)).where(Application.job_id == job_id)).scalar()
    set_cached_result(f"rank_{job_id}", {"data": res_data, "app_count": app_count})
    
    return res_data


@router.post("/rank/{job_id}/shortlist/{candidate_id}")
async def toggle_shortlist(
    job_id: int,
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = get_owned_job(db, job_id, current_user)
    app_record = db.execute(select(Application).where(Application.job_id == job_id, Application.cv_record_id == candidate_id)).scalars().first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")

    was_shortlisted = app_record.status == "shortlisted"
    app_record.status = "shortlisted" if not was_shortlisted else "applied"

    if not was_shortlisted:
        # Notify Seeker
        notif = Notification(
            user_id=app_record.user_id,
            title="Shortlisted!",
            message=f"You've been shortlisted for '{job.title}'.",
            type="success",
            extra_data={"app_id": app_record.id, "job_id": job.id}
        )
        db.add(notif)
        db.flush()  # assign notif.id before it is sent over the socket

        # Targeted notification for Seeker
        await manager.send_personal_message({
            "event": "notification",
            "notif_id": notif.id,
            "data": {"title": "Shortlisted!", "message": f"Shortlisted for {job.title}"}
        }, user_id=app_record.user_id)

    db.commit()
    return {"status": "success", "is_shortlisted": app_record.status == "shortlisted"}


@router.get("/shortlisted")
def get_shortlisted_candidates(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    my_jobs = db.execute(select(Job.id).where(Job.recruiter_id == current_user.id)).scalars().all()
    if not my_jobs:
        return []
    
    shortlisted_apps = db.execute(select(Application).where(Application.job_id.in_(my_jobs), Application.status == "shortlisted")).scalars().all()
    
    out = []
    for app_record in shortlisted_apps:
        cv_rec = db.execute(select(CVRecord).where(CVRecord.id == app_record.cv_record_id)).scalar_one_or_none()
        if not cv_rec:
            continue
        out.append({
            "id": app_record.id,
            "candidateId": str(cv_rec.id),
            "jobId": str(app_record.job_id),
            "skills": cv_rec.extracted.get("skills", []),
            "experienceSummary": f"{cv_rec.extracted.get('experience_years', 0)} years",
            "educationLevel": f"CGPA: {cv_rec.extracted.get('cgpa', 'N/A')}",
            "matchPercentage": int(cv_rec.scoring.get("score_breakdown", {}).get("total", 0)),
            "isRevealed": app_record.reveal_status == "approved",
            "revealStatus": app_record.reveal_status,
            "company": cv_rec.extracted.get("last_company", "N/A"),
        })
    return out


@router.post("/jobs/{job_id}/shortlist-suggestions")
@router.post("/jobs/{job_id}/auto-shortlist")  # legacy path; same read-only behaviour
def suggest_shortlist(
    job_id: int,
    threshold: float = Query(REVIEW_THRESHOLD, ge=0.0, le=100.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Advisory only: scores pending applications against this job and returns suggestions.
    It never changes an application's status and never notifies candidates."""
    job = get_owned_job(db, job_id, current_user)
    return ShortlistSuggestionService(db, score_agent).suggest(job, threshold=threshold)


@router.get("/bias-report")
def bias_report() -> Dict[str, Any]:
    """
    TRACK 1 (secondary): compute fairness metrics on dataset.
    - demographic_parity: selection_rate(male) - selection_rate(female)
    - equal_opportunity: TPR(male) - TPR(female), where qualified defined by Interview_Score >= 60
    """
    import pandas as pd

    dataset_path = os.path.join(DATA_DIR, "final_bias_hiring_dataset.csv")
    if not os.path.exists(dataset_path):
        return {
            "bias_detected": False,
            "metrics": {"demographic_parity": 0.0, "equal_opportunity": 0.0},
            "summary": "Dataset not found; bias report unavailable.",
        }

    df = pd.read_csv(dataset_path)
    # normalize
    df["Gender"] = df["Gender"].astype(str).str.strip().str.lower()
    df["Final_Decision"] = df["Final_Decision"].astype(str).str.strip().str.lower()
    df["selected"] = (df["Final_Decision"] == "selected").astype(int)

    def selection_rate(g: str) -> float:
        sub = df[df["Gender"] == g]
        if len(sub) == 0:
            return 0.0
        return float(sub["selected"].mean())

    male_rate = selection_rate("male")
    female_rate = selection_rate("female")
    demographic_parity = male_rate - female_rate

    # Equal opportunity: TPR difference among qualified (Interview_Score >= 60)
    df["qualified"] = (df["Interview_Score"] >= 60).astype(int)

    def tpr(g: str) -> float:
        sub = df[(df["Gender"] == g) & (df["qualified"] == 1)]
        if len(sub) == 0:
            return 0.0
        return float(sub["selected"].mean())

    eo_diff = tpr("male") - tpr("female")

    bias_detected = bool(abs(demographic_parity) >= 0.05 or abs(eo_diff) >= 0.05)
    summary = "Bias detected due to educational institute influence" if bias_detected else "No strong bias signal detected by selected metrics"

    return {
        "bias_detected": bias_detected,
        "metrics": {"demographic_parity": round(demographic_parity, 4), "equal_opportunity": round(eo_diff, 4)},
        "summary": summary,
    }
