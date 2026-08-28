"""
AI Resume Intelligence Platform — FastAPI REST API
Replaces the Streamlit frontend with a clean, modular REST API.
"""

from __future__ import annotations

import logging
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .services.analysis_service import ResumeAnalysisService
from .knowledge.repository import KnowledgeRepository

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Resume Intelligence Platform",
    description="Modular resume parsing, ATS scoring, and recommendation engine.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the Vite dev server and any same-origin deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Keep a single KnowledgeRepository instance
_knowledge_repo = KnowledgeRepository()


# ---------------------------------------------------------------------------
# Response schemas (Pydantic)
# ---------------------------------------------------------------------------

class PersonalInfo(BaseModel):
    name: Optional[str] = None
    professional_title: Optional[str] = None
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    address: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    website: Optional[str] = None
    college_name: Optional[str] = None
    degree: Optional[str] = None
    designation: Optional[str] = None
    company_names: List[str] = []
    no_of_pages: int = 0
    candidate_level: Optional[str] = None


class ExperienceItem(BaseModel):
    company: str = ""
    position: str = ""
    employment_period: str = ""
    location: str = ""
    responsibilities: List[str] = []
    achievements: List[str] = []
    technologies_used: List[str] = []


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
    dates: str = ""
    gpa: str = ""
    coursework: List[str] = []


class ProjectItem(BaseModel):
    name: str = ""
    description: str = ""
    technologies: List[str] = []


class NormalizedSkillItem(BaseModel):
    original: str
    normalized: str
    category: str
    confidence: float


class ATSBreakdownItem(BaseModel):
    name: str
    score: int
    max_score: int
    icon: str
    explanation: str


class ATSScoreResponse(BaseModel):
    overall: int
    breakdown: List[ATSBreakdownItem]
    strengths: List[str]
    improvements: List[str]
    keywords_found: List[str]
    section_coverage: Dict[str, bool]


class RecommendationResponse(BaseModel):
    predicted_field: Optional[str] = None
    recommended_skills: List[str] = []
    recommended_courses: List[Any] = []
    notes: Optional[str] = None


class SkillCategory(BaseModel):
    name: str
    skills: List[str]


class AnalysisResponse(BaseModel):
    success: bool
    filename: str
    provider_used: str
    fallback_used: bool = False
    confidence_score: float = 0.0
    personal_info: PersonalInfo
    skills: List[str]
    technical_skills: List[str] = []
    soft_skills: List[str] = []
    skill_categories: Dict[str, List[str]] = {}
    normalized_skill_map: List[NormalizedSkillItem] = []
    experience: Optional[str] = None
    experiences: List[ExperienceItem] = []
    total_experience: float = 0.0
    projects: List[str] = []
    project_details: List[ProjectItem] = []
    education: Optional[str] = None
    education_entries: List[EducationItem] = []
    summary: Optional[str] = None
    certifications: List[str] = []
    languages: List[str] = []
    awards: List[str] = []
    publications: List[str] = []
    interests: List[str] = []
    ats_score: ATSScoreResponse
    recommendation: RecommendationResponse


class SkillMappingItem(BaseModel):
    raw: str
    normalized: str
    category: str


class HealthResponse(BaseModel):
    status: str
    version: str
    providers: List[str]


class JobMatchRequest(BaseModel):
    job_description: str
    skills: List[str] = []


class JobMatchResponse(BaseModel):
    match_score: int
    missing_keywords: List[str]
    matching_keywords: List[str]
    action_plan: List[Dict[str, str]]
    career_fit_analysis: str
    suggested_improvements: List[str]


# ---------------------------------------------------------------------------
# Icon mapping helper
# ---------------------------------------------------------------------------
_SCORE_ICONS: Dict[str, str] = {
    "contact": "user",
    "experience": "briefcase",
    "education": "graduation-cap",
    "projects": "folder-open",
    "skills": "cpu",
    "formatting": "layout",
    "keyword_match": "key",
}

_SCORE_MAX: Dict[str, int] = {
    "contact": 10,
    "experience": 20,
    "education": 15,
    "projects": 20,
    "skills": 20,
    "formatting": 5,
    "keyword_match": 10,
}

_SCORE_NAMES: Dict[str, str] = {
    "contact": "Contact & Links",
    "experience": "Work Experience",
    "education": "Education Info",
    "projects": "Projects",
    "skills": "Skills Database",
    "formatting": "Formatting & Style",
    "keyword_match": "Keyword Match",
}


def _build_ats_response(ats_payload: Dict[str, Any]) -> ATSScoreResponse:
    sub_scores: Dict[str, int] = ats_payload.get("sub_scores", {})
    detailed: List[str] = ats_payload.get("detailed_explanations", [])

    breakdown: List[ATSBreakdownItem] = []
    for k, v in sub_scores.items():
        max_score = _SCORE_MAX.get(k, 10)
        ratio = (v / max_score) if max_score else 0
        if ratio >= 0.8:
            explanation = f"Strong { _SCORE_NAMES.get(k, k).lower() } section with high ATS readiness."
        elif ratio >= 0.5:
            explanation = f"Moderate { _SCORE_NAMES.get(k, k).lower() } quality; targeted improvements can increase ranking."
        else:
            explanation = f"Weak { _SCORE_NAMES.get(k, k).lower() } coverage; prioritize improvements in this area."

        breakdown.append(
            ATSBreakdownItem(
                name=_SCORE_NAMES.get(k, k.replace("_", " ").title()),
                score=v,
                max_score=max_score,
                icon=_SCORE_ICONS.get(k, "help-circle"),
                explanation=explanation,
            )
        )

    # Partition explanations into strengths and improvements
    strengths = [
        e for e in detailed
        if not (
            e.startswith("Missing")
            or e.startswith("No ")
            or "lacks" in e.lower()
            or "minimal" in e.lower()
            or "can be improved" in e.lower()
            or "recommend" in e.lower()
        )
    ]
    improvements = [e for e in detailed if e not in strengths]

    return ATSScoreResponse(
        overall=ats_payload.get("score", 0),
        breakdown=breakdown,
        strengths=strengths,
        improvements=improvements,
        keywords_found=ats_payload.get("keywords_found", []),
        section_coverage=ats_payload.get("section_coverage", {}),
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", tags=["health"])
async def root():
    return {"message": "AI Resume Intelligence Platform API", "docs": "/docs"}


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    return HealthResponse(
        status="operational",
        version="2.0.0",
        providers=["auto", "custom_rule", "gemini"],
    )


@app.post(
    "/api/analyze",
    response_model=AnalysisResponse,
    tags=["resume"],
    summary="Upload and analyze a resume (PDF or DOCX)",
)
async def analyze_resume(
    file: UploadFile = File(..., description="Resume file (PDF or DOCX)"),
    provider: str = Form(default="auto", description="Extraction provider: auto | custom_rule | gemini"),
):
    """
    Upload a resume file and receive:
    - Parsed personal info, skills, experience, education
    - ATS score with explainable sub-scores
    - Career field recommendation and skill suggestions
    """
    # Validate MIME / extension before saving
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    if ext not in {".pdf", ".docx"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{ext}'. Only PDF and DOCX are accepted.",
        )

    # Save to a temp file
    tmp_dir = Path(tempfile.mkdtemp())
    tmp_path = tmp_dir / f"{uuid.uuid4()}{ext}"
    try:
        with tmp_path.open("wb") as fh:
            shutil.copyfileobj(file.file, fh)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {exc}")
    finally:
        await file.close()

    try:
        service = ResumeAnalysisService(provider=provider)

        # 1. File validation
        is_valid, errors = service.validate_file(tmp_path)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"validation_errors": errors},
            )

        # 2. Full analysis pipeline
        result = service.analyze_resume(tmp_path)

        rd = result.resume_data
        ats = result.ats_result
        rec = result.recommendation

        personal_info = PersonalInfo(
            name=rd.name,
            professional_title=rd.professional_title,
            email=rd.email,
            mobile_number=rd.mobile_number,
            address=rd.address,
            linkedin=rd.linkedin,
            github=rd.github,
            portfolio=rd.portfolio,
            website=rd.website,
            college_name=rd.college_name,
            degree=rd.degree,
            designation=rd.designation,
            company_names=rd.company_names,
            no_of_pages=rd.no_of_pages,
            candidate_level=result.candidate_level,
        )

        ats_response = _build_ats_response({
            "score": ats.score,
            "sub_scores": ats.sub_scores,
            "detailed_explanations": ats.detailed_explanations,
            "keywords_found": ats.keywords_found,
            "section_coverage": ats.section_coverage,
        })

        recommendation_response = RecommendationResponse(
            predicted_field=rec.predicted_field,
            recommended_skills=rec.recommended_skills,
            recommended_courses=rec.recommended_courses,
            notes=rec.notes,
        )

        return AnalysisResponse(
            success=True,
            filename=filename,
            provider_used=result.provider_used,
            fallback_used=result.fallback_used,
            confidence_score=result.confidence_score,
            personal_info=personal_info,
            skills=rd.skills,
            technical_skills=rd.technical_skills,
            soft_skills=rd.soft_skills,
            skill_categories=rd.skill_categories,
            normalized_skill_map=rd.normalized_skill_map,
            experience=rd.experience,
            experiences=rd.experiences,
            total_experience=rd.total_experience,
            projects=rd.projects,
            project_details=rd.project_details,
            education=rd.education,
            education_entries=rd.education_entries,
            summary=rd.summary,
            certifications=rd.certifications,
            languages=rd.languages,
            awards=rd.awards,
            publications=rd.publications,
            interests=rd.interests,
            ats_score=ats_response,
            recommendation=recommendation_response,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unhandled error during resume analysis")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(exc)}")
    finally:
        # Cleanup temp file
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass


@app.get(
    "/api/knowledge/skills",
    tags=["knowledge"],
    summary="Get all known skill aliases from the knowledge repository",
)
async def get_skill_mappings():
    """Return the alias dictionary for the Skills Normalization Dictionary view."""
    alias_map = _knowledge_repo.alias_map
    mappings = []
    for raw, normalized in alias_map.items():
        # Simple category heuristic
        category = "backend"
        fe_terms = {"react", "html", "css", "typescript", "javascript", "vue", "angular", "next.js", "figma"}
        devops_terms = {"aws", "gcp", "docker", "azure", "kubernetes", "ci/cd", "terraform"}
        if any(t in raw.lower() or t in normalized.lower() for t in fe_terms):
            category = "frontend"
        elif any(t in raw.lower() or t in normalized.lower() for t in devops_terms):
            category = "devops"
        mappings.append({"raw": raw, "normalized": normalized, "category": category})
    return {"mappings": mappings}


@app.post(
    "/api/knowledge/skills",
    tags=["knowledge"],
    summary="Add a new skill alias to the knowledge repository",
)
async def add_skill_mapping(mapping: SkillMappingItem):
    """Register a new raw→normalized skill alias."""
    raw = mapping.raw.strip().lower()
    if not raw or not mapping.normalized.strip():
        raise HTTPException(status_code=400, detail="Both raw and normalized fields are required.")
    if raw in _knowledge_repo.alias_map:
        raise HTTPException(status_code=409, detail=f"Alias '{mapping.raw}' already exists.")
    _knowledge_repo.alias_map[raw] = mapping.normalized.strip()
    return {"success": True, "message": f"Alias '{mapping.raw}' → '{mapping.normalized}' registered."}


@app.delete(
    "/api/knowledge/skills/{raw_term}",
    tags=["knowledge"],
    summary="Remove a skill alias from the knowledge repository",
)
async def delete_skill_mapping(raw_term: str):
    """Delete a skill alias by raw term."""
    key = raw_term.strip().lower()
    if key not in _knowledge_repo.alias_map:
        raise HTTPException(status_code=404, detail=f"Alias '{raw_term}' not found.")
    del _knowledge_repo.alias_map[key]
    return {"success": True, "message": f"Alias '{raw_term}' deleted."}


@app.post(
    "/api/job-match",
    response_model=JobMatchResponse,
    tags=["matching"],
    summary="Semantic job description matching against extracted resume skills",
)
async def job_match(request: JobMatchRequest):
    """
    Compare a job description against a list of resume skills.
    Returns a match score, missing keywords, and an optimization action plan.
    """
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="job_description cannot be empty.")

    jd_lower = request.job_description.lower()
    resume_skills_lower = [s.lower() for s in request.skills]

    # Build a keyword vocab from the JD
    import re
    jd_tokens = set(re.findall(r"\b[a-zA-Z][a-zA-Z0-9+#.\-]{1,}\b", jd_lower))

    # Filter to meaningful tech/role keywords (skip stop words)
    stopwords = {
        "the", "and", "for", "with", "that", "this", "are", "you", "will", "have",
        "from", "your", "our", "their", "they", "be", "is", "in", "of", "to", "a",
        "an", "as", "at", "by", "on", "or", "we", "it", "not", "but", "if", "all",
        "any", "can", "has", "was", "who", "use", "using", "work", "team", "role",
        "also", "about", "such", "than", "up", "into", "more", "when", "other",
        "should", "must", "help", "may", "its", "so", "do", "new", "need", "us",
    }
    jd_keywords = {t for t in jd_tokens if t not in stopwords and len(t) > 2}

    matching: List[str] = []
    missing: List[str] = []

    for kw in jd_keywords:
        if any(kw in skill or skill in kw for skill in resume_skills_lower):
            matching.append(kw)
        else:
            missing.append(kw)

    total = len(jd_keywords) if jd_keywords else 1
    match_score = min(100, int((len(matching) / total) * 100) + 10)

    # Generate a prioritized action plan
    top_missing = sorted(missing, key=lambda x: -len(x))[:8]
    action_plan: List[Dict[str, str]] = []
    for i, kw in enumerate(top_missing):
        importance = "High" if i < 3 else "Medium" if i < 6 else "Low"
        action_plan.append({
            "step": f"Add '{kw}' to your resume — it appears prominently in this job description.",
            "importance": importance,
        })

    if match_score >= 80:
        career_fit_analysis = "Strong fit for the role based on current resume skills and terminology coverage."
    elif match_score >= 60:
        career_fit_analysis = "Moderate fit: core requirements are present, but there are notable missing skills to address."
    else:
        career_fit_analysis = "Limited fit right now. Significant skill and keyword gaps should be addressed before applying."

    suggested_improvements = [
        f"Include concrete evidence for '{kw}' in work experience or projects."
        for kw in top_missing[:5]
    ]

    return JobMatchResponse(
        match_score=match_score,
        missing_keywords=top_missing,
        matching_keywords=sorted(matching)[:15],
        action_plan=action_plan,
        career_fit_analysis=career_fit_analysis,
        suggested_improvements=suggested_improvements,
    )
