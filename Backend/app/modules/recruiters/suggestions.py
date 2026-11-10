from __future__ import annotations

import logging
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Application, CVRecord, Job
from app.modules.resume_engine.agents.scoring import FeatureScoringAgent

logger = logging.getLogger(__name__)


# Score at or above which the AI *suggests* a recruiter takes a closer look.
# It is advisory only: no code path turns it into a shortlist or rejection.
REVIEW_THRESHOLD = 70.0


class ShortlistSuggestionService:
    """
    Agent 7 (advisory): ranks a job's pending applications and suggests which ones a
    recruiter may want to shortlist.

    Read-only by design. It does not change application status, write explanations,
    or notify candidates. Hiring decisions are made only by a recruiter through the
    shortlist / reject endpoints.
    """

    def __init__(self, db: Session, scorer: FeatureScoringAgent):
        self.db = db
        self.scorer = scorer

    def suggest(self, job: Job, threshold: float = REVIEW_THRESHOLD) -> Dict[str, Any]:
        rows = self.db.execute(
            select(Application, CVRecord)
            .join(CVRecord, Application.cv_record_id == CVRecord.id)
            .where(Application.job_id == job.id, Application.status == "applied")
        ).all()

        suggestions: List[Dict[str, Any]] = []
        for application, cv_rec in rows:
            # Score against THIS job's requirements, never the CV's generic upload-time score.
            features = self.scorer.score_for_job(cv_rec.extracted, job.required_skills)
            score = features.score_breakdown.total
            suggestions.append({
                "application_id": application.id,
                "candidate_id": cv_rec.id,
                "score": round(score, 2),
                "suggestion": "shortlist" if score >= threshold else "review",
                "skills_matched": features.skills_matched,
                "missing_skills": features.missing_skills,
            })

        suggestions.sort(key=lambda s: s["score"], reverse=True)
        suggested = sum(1 for s in suggestions if s["suggestion"] == "shortlist")

        if suggestions:
            message = (
                f"AI suggests shortlisting {suggested} of {len(suggestions)} pending application(s) for "
                f"'{job.title}' (score >= {threshold:.0f}). Review them before deciding; nothing has been changed."
            )
        else:
            message = f"No pending applications for '{job.title}'."

        logger.info("Shortlist suggestions for job %s: %d of %d above threshold", job.id, suggested, len(suggestions))
        return {
            "status": "success",
            "advisory_only": True,
            "message": message,
            "processed": len(suggestions),
            "suggested_shortlist": suggested,
            "needs_review": len(suggestions) - suggested,
            "threshold_used": threshold,
            "suggestions": suggestions,
        }
