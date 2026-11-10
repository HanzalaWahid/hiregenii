"""HTTP routes for the resumes module (moved verbatim from the Hire-geni API)."""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import Application, CVRecord, Job, Notification, User
from app.db.session import get_db
from app.modules.recruiters.suggestions import REVIEW_THRESHOLD
from app.services.access import decision_label, ensure_not_already_applied
from app.services.agents import anon_agent, cv_agent, rec_agent, score_agent, xai_agent
from app.services.realtime import manager
from app.services.text_extraction import extract_text_from_docx, extract_text_from_pdf

from app.core import config

router = APIRouter()

logger = logging.getLogger(__name__)

UPLOAD_DIR = config.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_CV_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_UPLOAD_BYTES = config.MAX_UPLOAD_BYTES
_UPLOAD_CHUNK_BYTES = 1024 * 1024
_CV_SIGNATURES = {".pdf": b"%PDF", ".docx": b"PK\x03\x04"}


def _safe_display_name(filename: Optional[str]) -> str:
    """Strip any client-supplied directory components; the name is only ever displayed."""
    name = os.path.basename((filename or "").replace("\\", "/")).strip()
    return name[:255] or "upload"


async def _read_upload_limited(file: UploadFile, max_bytes: int) -> bytes:
    chunks: List[bytes] = []
    total = 0
    while True:
        chunk = await file.read(_UPLOAD_CHUNK_BYTES)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {max_bytes // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("/upload_cv/")
@router.post("/cv/upload")  # new alias (keeps existing frontend compatibility)
async def upload_cv(
    file: UploadFile = File(...),
    job_id: Optional[int] = Query(None),
    fair_mode: bool = False,
    remove_institute: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    CV Upload → CV Processing → (optional) Anonymization toggle → Feature Extraction → Scoring → Explanation → Job Recommendation
    - fair_mode=true forces institute removal.
    - remove_institute can explicitly control institute redaction.
    """
    # Resolve the job and reject repeat applications before doing any file or NLP work.
    job_obj = None
    if job_id:
        job_obj = db.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()
        if not job_obj:
            raise HTTPException(status_code=404, detail="Job not found.")
        ensure_not_already_applied(db, job_obj.id, current_user.id)

    # The client filename is display-only; it never influences the storage path.
    display_name = _safe_display_name(file.filename)
    ext = os.path.splitext(display_name)[1].lower()
    if ext not in ALLOWED_CV_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Unsupported file format. Use PDF, DOCX, or TXT.")

    content = await _read_upload_limited(file, MAX_UPLOAD_BYTES)
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    signature = _CV_SIGNATURES.get(ext)
    if signature and not content.startswith(signature):
        raise HTTPException(status_code=415, detail=f"File content does not match the {ext} format.")

    if ext == ".txt":
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=415, detail="Text files must be UTF-8 encoded.")
    else:
        file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}{ext}")
        with open(file_path, "wb") as f:
            f.write(content)
        try:
            text = extract_text_from_pdf(file_path) if ext == ".pdf" else extract_text_from_docx(file_path)
        except Exception:
            logger.exception("CV text extraction failed")
            raise HTTPException(status_code=422, detail="Could not read text from this file. Please upload a valid, text-based CV.")

    parsed = cv_agent.process(text)

    do_remove_institute = bool(fair_mode) if remove_institute is None else bool(remove_institute)
    anon = anon_agent.anonymize(
        parsed.raw_text,
        remove_institute=do_remove_institute,
        institute_hint=parsed.education_institute,
        name_hint=current_user.full_name,
    )

    features = score_agent.extract_and_score(
        cv_skills=parsed.skills,
        experience_years=parsed.experience_years,
        projects_count=parsed.projects_count,
        certifications_count=parsed.certifications_count,
        cgpa=parsed.cgpa,
        institute=None if do_remove_institute else parsed.education_institute,
        job_required_skills=job_obj.required_skills if job_obj else [],
        # Institute prestige must never influence a stored score (it feeds ranking/decisions).
        include_institute_bias=False,
    )

    # threshold chosen so institute-bias can flip decisions around boundary
    threshold = REVIEW_THRESHOLD
    _xai_view = "anonymized" if do_remove_institute else "normal"
    _job_title = job_obj.title if job_obj else None
    seeker_expl = xai_agent.explain(features=features, decision_threshold=threshold, view=_xai_view, audience="seeker", job_title=_job_title)
    recruiter_expl = xai_agent.explain(features=features, decision_threshold=threshold, view=_xai_view, audience="recruiter", job_title=_job_title)

    recs = rec_agent.recommend(cv_skills=parsed.skills, jobs=[{"job_id": j.id, "title": j.title, "required_skills": j.required_skills} for j in db.execute(select(Job)).scalars().all()], top_k=5)

    response = {
        "candidate_id": 0, # will set after DB insert
        "job_context": {"job_id": job_obj.id, "title": job_obj.title} if job_obj else None,
        "toggle_view": "anonymized" if do_remove_institute else "normal",
        "cv": {
            "filename": display_name,
            "original_text": parsed.raw_text,
            "anonymized_text": anon.anonymized_text,
            "removed": {
                "name": anon.removed_name,
                "email": anon.removed_email,
                "phone": anon.removed_phone,
                "institute": anon.removed_institute,
                "address": anon.removed_address,
                "nationality": anon.removed_nationality,
                "gender": anon.removed_gender,
                "organization": anon.removed_organization,
            },
        },
        "extracted": {
            "summary": parsed.summary,
            "skills": parsed.skills,
            "experience_years": parsed.experience_years,
            "projects": parsed.projects,
            "projects_count": parsed.projects_count,
            "certifications_count": parsed.certifications_count,
            "cgpa": parsed.cgpa,
            "education_institute": None if do_remove_institute else parsed.education_institute,
        },
        "scoring": {
            "score": features.score_breakdown.total,
            "score_breakdown": seeker_expl.score_breakdown,
            "skills_matched": features.skills_matched,
            "missing_skills": features.missing_skills,
        },
        "explanations": {
            "job_seeker": seeker_expl.__dict__,
            "recruiter": recruiter_expl.__dict__,
        },
        "recommendations": [r.__dict__ for r in recs],
    }

    # Persist to DB (user-specific record)
    max_cand_id = db.execute(select(func.max(CVRecord.candidate_id)).where(CVRecord.user_id == current_user.id)).scalar() or 0
    new_candidate_id = max_cand_id + 1

    rec = CVRecord(
        user_id=current_user.id,
        candidate_id=new_candidate_id,
        filename=display_name,
        toggle_view=str(response["toggle_view"]),
        original_text=str(response["cv"]["original_text"]),
        anonymized_text=str(response["cv"]["anonymized_text"]),
        removed=dict(response["cv"]["removed"]),
        extracted=dict(response["extracted"]),
        scoring=dict(response["scoring"]),
        explanations=dict(response["explanations"]),
        recommendations=list(response["recommendations"]),
    )
    db.add(rec)
    db.flush() # get rec.id

    # Create application record only if job context exists
    if job_obj:
        app_rec = Application(
            job_id=job_obj.id,
            user_id=current_user.id,
            cv_record_id=rec.id,
            score=features.score_breakdown.total,
            status="applied",
            # Store BOTH job-specific XAI explanations here so they are never overwritten
            # by another job's autopilot run (which only updates cv_rec.explanations).
            xai_explanation={
                "job_seeker": seeker_expl.__dict__,
                "recruiter": recruiter_expl.__dict__,
            },
        )
        db.add(app_rec)

        # Persist Notification to DB. Applications are anonymous until the candidate
        # approves a reveal, so the recruiter is never told the candidate's name here.
        notif = Notification(
            user_id=job_obj.recruiter_id,
            title="New Application",
            message=f"Someone applied for '{job_obj.title}'.",
            type="success",
            extra_data={"job_id": job_obj.id, "candidate_name": "Anonymous Candidate"}
        )
        db.add(notif)

    try:
        db.commit()
    except IntegrityError:
        # Lost a race with a concurrent application for the same job.
        db.rollback()
        raise HTTPException(status_code=409, detail="You have already applied for this job.")

    if job_obj:
        # Real-time notification for recruiter, only once the application is committed.
        await manager.send_personal_message({
            "event": "new_application",
            "notif_id": notif.id,
            "data": {
                "job_id": job_obj.id,
                "job_title": job_obj.title,
                "candidate_name": "Anonymous Candidate"
            }
        }, user_id=job_obj.recruiter_id)

    response["candidate_id"] = rec.id # Use DB ID as candidate_id
    return response


@router.post("/cv/re-process")
def reprocess_cv(
    fair_mode: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Re-runs anonymization, skill extraction and experience calculation on the
    stored CV text without requiring a re-upload.  Use this after a pipeline fix.
    """
    latest = (
        db.execute(
            select(CVRecord)
            .where(CVRecord.user_id == current_user.id)
            .order_by(CVRecord.created_at.desc())
            .limit(1)
        ).scalar_one_or_none()
    )
    if not latest:
        raise HTTPException(status_code=404, detail="No CV found. Please upload a CV first.")

    original_text = latest.original_text

    # Re-run CV parsing pipeline on the original text
    parsed = cv_agent.process(original_text)

    do_remove_institute = fair_mode
    anon = anon_agent.anonymize(
        original_text,
        remove_institute=do_remove_institute,
        institute_hint=parsed.education_institute,
        name_hint=current_user.full_name,
    )

    # Re-score against no specific job (generic)
    features = score_agent.extract_and_score(
        cv_skills=parsed.skills,
        experience_years=parsed.experience_years,
        projects_count=parsed.projects_count,
        certifications_count=parsed.certifications_count,
        cgpa=parsed.cgpa,
        institute=None if do_remove_institute else parsed.education_institute,
        job_required_skills=[],
        include_institute_bias=False,
    )

    threshold = REVIEW_THRESHOLD
    seeker_expl = xai_agent.explain(features=features, decision_threshold=threshold, view="anonymized", audience="seeker")
    recruiter_expl = xai_agent.explain(features=features, decision_threshold=threshold, view="anonymized", audience="recruiter")

    recs = rec_agent.recommend(
        cv_skills=parsed.skills,
        jobs=[{"job_id": j.id, "title": j.title, "required_skills": j.required_skills}
              for j in db.execute(select(Job)).scalars().all()],
        top_k=5
    )

    # Persist updated fields back to the record
    latest.anonymized_text = anon.anonymized_text
    latest.toggle_view = "anonymized" if do_remove_institute else "normal"
    latest.removed = {
        "name": anon.removed_name,
        "email": anon.removed_email,
        "phone": anon.removed_phone,
        "institute": anon.removed_institute,
        "nationality": anon.removed_nationality,
        "gender": anon.removed_gender,
        "organization": anon.removed_organization,
    }
    latest.extracted = {
        "summary": parsed.summary,
        "skills": parsed.skills,
        "experience_years": parsed.experience_years,
        "projects": parsed.projects,
        "projects_count": parsed.projects_count,
        "certifications_count": parsed.certifications_count,
        "cgpa": parsed.cgpa,
        "education_institute": None if do_remove_institute else parsed.education_institute,
    }
    latest.scoring = {
        "score": features.score_breakdown.total,
        "score_breakdown": seeker_expl.score_breakdown,
        "skills_matched": features.skills_matched,
        "missing_skills": features.missing_skills,
    }
    latest.explanations = {
        "job_seeker": seeker_expl.__dict__,
        "recruiter": recruiter_expl.__dict__,
    }
    latest.recommendations = [r.__dict__ for r in recs]

    db.commit()

    return {
        "message": "CV re-processed successfully with updated pipeline.",
        "candidate_id": latest.id,
        "skills_extracted": parsed.skills,
        "experience_years": parsed.experience_years,
        "anonymization_applied": do_remove_institute,
    }


@router.get("/cv/my/latest")
def my_latest_cv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    latest = (
        db.execute(
            select(CVRecord)
            .where(CVRecord.user_id == current_user.id)
            .order_by(CVRecord.created_at.desc())
            .limit(1)
        )
        .scalar_one_or_none()
    )
    if not latest:
        raise HTTPException(status_code=404, detail="No CV found for this user. Upload one first.")
    return {
        "candidate_id": latest.id, # Fixed here too
        "toggle_view": latest.toggle_view,
        "cv": {
            "filename": latest.filename,
            "original_text": latest.original_text,
            "anonymized_text": latest.anonymized_text,
            "removed": latest.removed,
        },
        "extracted": latest.extracted,
        "scoring": latest.scoring,
        "explanations": latest.explanations,
        "recommendations": latest.recommendations,
    }


@router.get("/cv/{cv_id}")
def get_cv_detail(
    cv_id: int,
    job_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    cv = db.execute(select(CVRecord).where(CVRecord.id == cv_id)).scalar_one_or_none()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    is_owner = cv.user_id == current_user.id
    is_recruiter = (current_user.role or "").strip().lower() == "recruiter"

    # Only consider applications the caller is entitled to see:
    #  - the CV owner: their own applications
    #  - a recruiter: applications to jobs they own (never another recruiter's job)
    app_query = select(Application).where(Application.cv_record_id == cv.id)
    if job_id:
        app_query = app_query.where(Application.job_id == job_id)
    if not is_owner:
        if not is_recruiter:
            raise HTTPException(status_code=404, detail="CV not found")
        app_query = app_query.join(Job, Application.job_id == Job.id).where(Job.recruiter_id == current_user.id)

    app_rec = db.execute(app_query).scalars().first()

    if not is_owner and not app_rec:
        # Recruiter has no application for this CV on any job they own.
        raise HTTPException(status_code=404, detail="CV not found")

    # Owner always sees their own data; a recruiter only after the candidate approves
    # the reveal for an application on that recruiter's own job.
    is_revealed = True if is_owner else bool(app_rec.reveal_status == "approved")

    can_see_pii = is_revealed
    user_of_cv = db.execute(select(User).where(User.id == cv.user_id)).scalar_one_or_none()
    profile = user_of_cv.profile if user_of_cv else None

    # Merge the job-specific application XAI if available
    final_explanations = dict(cv.explanations or {})
    if app_rec and app_rec.xai_explanation:
        xai_data = app_rec.xai_explanation
        if "job_seeker" in xai_data or "recruiter" in xai_data:
            if "job_seeker" in xai_data:
                final_explanations["job_seeker"] = xai_data["job_seeker"]
            if "recruiter" in xai_data:
                final_explanations["recruiter"] = xai_data["recruiter"]
        else:
            # Fallback for old migration format (where only seeker data was stored)
            final_explanations["job_seeker"] = xai_data

    # The decision shown is always the human-set application status, never an AI verdict
    # (older records may still carry threshold-based "Selected"/"Rejected" labels).
    status_label = decision_label(app_rec.status if app_rec else None)
    for key in ("job_seeker", "recruiter"):
        if isinstance(final_explanations.get(key), dict):
            final_explanations[key] = {**final_explanations[key], "decision": status_label}

    pii_resp = {
        "full_name": user_of_cv.full_name if (can_see_pii and user_of_cv) else "Hidden",
        "email": user_of_cv.email if (can_see_pii and user_of_cv) else "Hidden",
        "phone": "Hidden",
        "institute": "Hidden",
        "address": "Hidden",
    }
    
    if can_see_pii:
        # Phone: Profile -> CV Removed
        pii_resp["phone"] = (profile.phone if profile and profile.phone else cv.removed.get("phone")) or "Hidden"
        # Institute: Profile -> CV Removed -> CV Extracted
        pii_resp["institute"] = (profile.current_university if profile and profile.current_university else cv.removed.get("institute")) or cv.extracted.get("education_institute") or "N/A"
        # Address: Profile -> CV Removed
        pii_resp["address"] = (profile.address if profile and profile.address else cv.removed.get("address")) or "N/A"

    return {
        "id": app_rec.id if app_rec else None,
        "candidate_id": cv.id,
        "user_id": cv.user_id,
        "toggle_view": cv.toggle_view,
        "is_revealed": is_revealed,
        "cv": {
            "filename": cv.filename,
            "original_text": cv.original_text if can_see_pii else cv.anonymized_text,
            "anonymized_text": cv.anonymized_text,
            # `removed` holds the raw PII values stripped by the anonymizer; never expose it before reveal.
            "removed": cv.removed if can_see_pii else {},
            "pii": pii_resp
        },
        "extracted": cv.extracted,
        "scoring": cv.scoring,
        "explanations": final_explanations,
        "shortlisted": app_rec.status == "shortlisted" if app_rec else False,
        "recommendations": cv.recommendations,
    }


@router.post("/cv/anonymize")
def anonymize_text_api(
    text: str = Body(..., embed=True),
    remove_institute: bool = Query(True),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Directly anonymize raw text using spaCy NER and regex.
    Toggle-based: remove_institute query param controls university masking.
    """
    res = anon_agent.anonymize(text, remove_institute=remove_institute)
    return {
        "original_text": text,
        "anonymized_text": res.anonymized_text,
        "removed": {
            "email": res.removed_email,
            "phone": res.removed_phone,
            "name": res.removed_name,
            "institute": res.removed_institute,
            "address": res.removed_address
        }
    }


@router.get("/recommend/{candidate_id}")
def recommend_jobs(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    cv_rec = db.execute(select(CVRecord).where(CVRecord.id == candidate_id)).scalar_one_or_none()
    # Only the CV owner may request recommendations; 404 avoids confirming other users' IDs.
    if not cv_rec or cv_rec.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Candidate not found")
    skills = cv_rec.extracted.get("skills", [])
    jobs = [{"job_id": j.id, "title": j.title, "required_skills": j.required_skills} for j in db.execute(select(Job)).scalars().all()]
    recs = rec_agent.recommend(cv_skills=skills, jobs=jobs, top_k=5)
    return {"candidate_id": candidate_id, "recommendations": [r.__dict__ for r in recs]}
