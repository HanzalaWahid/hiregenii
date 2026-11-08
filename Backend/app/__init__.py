"""AI Resume Analyzer backend package.

This package provides a comprehensive resume analysis platform with:
- Resume extraction and parsing
- ATS (Applicant Tracking System) scoring
- Skill recommendations and course suggestions
- Knowledge repository for skill mappings
"""

from .ats import ATSScorer, RuleBasedATSScorer
from .knowledge import KnowledgeRepository
from .models import ATSResult, RecommendationResult, ResumeAnalysisResult, ResumeData
from .parser import (
    CerebrasExtractor,
    CustomRuleBasedExtractor,
    GeminiExtractor,
    ResumeExtractor,
)
from .recommendation import RecommendationEngine, RuleBasedRecommendationEngine
from .services import ResumeAnalysisService
from .validation import validate_resume

__all__ = [
    # Models
    "ResumeData",
    "ATSResult",
    "RecommendationResult",
    "ResumeAnalysisResult",
    # ATS
    "ATSScorer",
    "RuleBasedATSScorer",
    # Parser
    "ResumeExtractor",
    "CustomRuleBasedExtractor",
    "CerebrasExtractor",
    "GeminiExtractor",
    # Recommendation
    "RecommendationEngine",
    "RuleBasedRecommendationEngine",
    # Knowledge
    "KnowledgeRepository",
    # Services
    "ResumeAnalysisService",
    # Validation
    "validate_resume",
]
