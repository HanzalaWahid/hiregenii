"""Aggregates every module router into one API router.

Order matters only where two routes can match the same request; each module keeps its
original route order (e.g. /jobs/my before /jobs/{job_id}, /cv/my/latest before /cv/{cv_id}).
"""

from fastapi import APIRouter

from app.modules.applications.router import router as applications_router
from app.modules.auth.router import router as auth_router
from app.modules.candidates.router import router as candidates_router
from app.modules.interviews.router import router as interviews_router
from app.modules.jobs.router import router as jobs_router
from app.modules.notifications.router import router as notifications_router
from app.modules.recruiters.router import router as recruiters_router
from app.modules.resumes.analysis_router import router as resume_analysis_router
from app.modules.resumes.router import router as resumes_router

api_router = APIRouter()

api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(candidates_router, tags=["candidates"])
api_router.include_router(applications_router, tags=["applications"])
api_router.include_router(jobs_router, tags=["jobs"])
api_router.include_router(resumes_router, tags=["resumes"])
api_router.include_router(resume_analysis_router, tags=["resume-analysis"])
api_router.include_router(recruiters_router, tags=["recruiters"])
api_router.include_router(interviews_router, tags=["interviews"])
api_router.include_router(notifications_router, tags=["notifications"])
