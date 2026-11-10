"""Shared, process-wide instances of the resume-engine agents.

Created once at import (each loads spaCy models), then reused by every router.
"""

from __future__ import annotations

from app.modules.resume_engine.agents import (
    AnonymizationAgent,
    CVProcessorAgent,
    ExplainableAIAgent,
    FeatureScoringAgent,
    RankingAgent,
    RecommendationAgent,
)

cv_agent = CVProcessorAgent()
anon_agent = AnonymizationAgent()
score_agent = FeatureScoringAgent()
rank_agent = RankingAgent()
xai_agent = ExplainableAIAgent()
rec_agent = RecommendationAgent()
