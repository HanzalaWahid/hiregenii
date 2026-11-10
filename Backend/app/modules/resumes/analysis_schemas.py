"""Response schemas for the resume analysis routes (moved from the AI Resume Analyzer API)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel

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
