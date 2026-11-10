from __future__ import annotations

from typing import Any, Dict, List, Optional

from .interfaces import RecommendationEngine
from ..Courses import courses, resume_videos, interview_videos

FIELD_KEYWORDS: Dict[str, List[str]] = {
    "data_science": ["tensorflow", "keras", "pytorch", "machine learning", "deep learning", "data science"],
    "web_development": ["react", "django", "node js", "javascript", "php", "laravel", "html", "css"],
    "android_development": ["android", "kotlin", "flutter", "java", "xml"],
    "ios_development": ["ios", "swift", "xcode", "objective-c", "cocoa"],
    "uiux_design": ["ux", "ui", "figma", "wireframe", "prototyping"],
    "finance": ["finance", "accounting", "budgeting", "valuation", "audit"],
    "marketing": ["marketing", "seo", "social media", "branding"],
    "project_management": ["project management", "scrum", "jira", "kanban"],
    "human_resources": ["human resources", "hr", "recruitment", "talent acquisition"],
}

FIELD_LABELS: Dict[str, str] = {
    "data_science": "Data Science",
    "web_development": "Web development",
    "android_development": "Android Development",
    "ios_development": "iOS Development",
    "uiux_design": "UI/UX Design",
    "finance": "Finance",
    "marketing": "Marketing",
    "project_management": "Project Management",
    "human_resources": "Human Resources",
}

FIELD_RECOMMENDATION_KEYS: Dict[str, str] = {
    "data_science": "data_science",
    "web_development": "web_development",
    "android_development": "android_development",
    "ios_development": "ios_development",
    "uiux_design": "uiux_design",
    "finance": "finance",
    "marketing": "marketing",
    "project_management": "project_management",
    "human_resources": "human_resources",
}


class RuleBasedRecommendationEngine(RecommendationEngine):
    def recommend(self, extracted_data: Dict[str, Any], text: str) -> Dict[str, Any]:
        normalized_text = text.lower() if text else ""
        predicted_field: Optional[str] = None
        matched_field: Optional[str] = None
        recommended_skills: List[str] = []
        recommended_courses: List[List[str]] = []
        notes = ""

        for field, keywords in FIELD_KEYWORDS.items():
            if any(keyword in normalized_text for keyword in keywords):
                matched_field = field
                break

        if matched_field:
            predicted_field = FIELD_LABELS.get(matched_field)
            recommended_courses = courses.get(FIELD_RECOMMENDATION_KEYS[matched_field], [])
            recommended_skills = [keyword.title() for keyword in FIELD_KEYWORDS[matched_field][:10]]
        else:
            notes = "No specific field detected from resume text."

        return {
            "predicted_field": predicted_field,
            "recommended_skills": recommended_skills,
            "recommended_courses": recommended_courses,
            "recommended_videos": [resume_videos[0], interview_videos[0]] if matched_field else [],
            "notes": notes,
        }
