"""Recommendation engine module for skill and course suggestions."""

from .engine import RuleBasedRecommendationEngine
from .interfaces import RecommendationEngine

__all__ = ["RecommendationEngine", "RuleBasedRecommendationEngine"]
