from __future__ import annotations
from dataclasses import dataclass
from typing import List, Sequence


@dataclass(frozen=True)
class JobRecommendation:
    job_id: int
    title: str
    similarity_percent: float


class RecommendationAgent:
    """
    Agent 6: Job Recommendation Agent (NLP-Based)
    Uses Jaccard Similarity and keyword matching instead of LLM.
    NO LLM usage as requested.
    """

    def recommend(self, *, cv_skills: Sequence[str], jobs: Sequence[dict], top_k: int = 5) -> List[JobRecommendation]:
        if not jobs or not cv_skills:
            return []

        cv = {s.strip().lower() for s in (cv_skills or []) if s.strip()}
        recs: List[JobRecommendation] = []

        for job in jobs:
            required_skills = job.get("required_skills", [])
            # Handle list of strings or list of dicts
            req = set()
            for s in required_skills:
                if isinstance(s, str):
                    name = s.strip().lower()
                elif isinstance(s, dict):
                    name = s.get("skill", "").strip().lower()
                else:
                    name = ""
                if name:
                    req.add(name)
            
            sim = 0.0
            if cv and req:
                # Jaccard similarity
                intersection = len(cv & req)
                union = len(cv | req)
                
                # Boost if many skills overlap
                sim = (intersection / max(1, union)) * 100.0
                
                # Minor boost for keyword overlap (if skill name contains a req skill or vice versa)
                if sim < 100:
                    for s_cv in cv:
                        for s_req in req:
                            if s_req in s_cv or s_cv in s_req:
                                sim = min(100.0, sim + 2.0)

            recs.append(JobRecommendation(
                job_id=int(job["job_id"]), 
                title=str(job["title"]), 
                similarity_percent=float(round(sim, 2))
            ))
        
        recs.sort(key=lambda r: r.similarity_percent, reverse=True)
        return recs[:top_k]
