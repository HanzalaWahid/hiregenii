from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class ResumeData:
    name: Optional[str] = None
    professional_title: Optional[str] = None
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    address: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    website: Optional[str] = None
    skills: List[str] = field(default_factory=list)
    technical_skills: List[str] = field(default_factory=list)
    soft_skills: List[str] = field(default_factory=list)
    skill_categories: Dict[str, List[str]] = field(default_factory=dict)
    normalized_skill_map: List[Dict[str, Any]] = field(default_factory=list)
    college_name: Optional[str] = None
    degree: Optional[str] = None
    designation: Optional[str] = None
    company_names: List[str] = field(default_factory=list)
    experience: Optional[str] = None
    experiences: List[Dict[str, Any]] = field(default_factory=list)
    total_experience: float = 0.0
    no_of_pages: int = 0
    projects: List[str] = field(default_factory=list)
    project_details: List[Dict[str, Any]] = field(default_factory=list)
    internships: List[str] = field(default_factory=list)
    achievements: List[str] = field(default_factory=list)
    certifications: List[str] = field(default_factory=list)
    languages: List[str] = field(default_factory=list)
    awards: List[str] = field(default_factory=list)
    publications: List[str] = field(default_factory=list)
    hobbies: List[str] = field(default_factory=list)
    interests: List[str] = field(default_factory=list)
    objective: Optional[str] = None
    education: Optional[str] = None
    education_entries: List[Dict[str, Any]] = field(default_factory=list)
    summary: Optional[str] = None
    raw_text: Optional[str] = None


@dataclass
class ATSResult:
    score: int
    section_coverage: Dict[str, bool]
    explanations: List[Dict[str, Any]]
    keywords_found: List[str]
    sub_scores: Dict[str, int] = field(default_factory=dict)
    detailed_explanations: List[str] = field(default_factory=list)


@dataclass
class RecommendationResult:
    predicted_field: Optional[str] = None
    recommended_skills: List[str] = field(default_factory=list)
    recommended_courses: List[List[str]] = field(default_factory=list)
    recommended_videos: List[str] = field(default_factory=list)
    notes: Optional[str] = None


@dataclass
class ResumeAnalysisResult:
    resume_data: ResumeData
    ats_result: ATSResult
    recommendation: RecommendationResult
    raw_text: Optional[str] = None
    candidate_level: Optional[str] = None
    provider_used: str = "custom_rule"
    fallback_used: bool = False
    confidence_score: float = 0.0
