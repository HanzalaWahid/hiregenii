from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any


@dataclass(frozen=True)
class ScoreBreakdown:
    experience: float
    skills: float
    projects: float
    certifications: float
    cgpa: float
    institute_bias: float
    total: float


@dataclass(frozen=True)
class FeatureResult:
    skills_matched: List[str]
    missing_skills: List[str]
    years_experience: float
    projects_count: int
    certifications_count: int
    cgpa: Optional[float]
    institute: Optional[str]
    similarity_to_job: float
    score_breakdown: ScoreBreakdown


class FeatureScoringAgent:
    """
    Agent 3: Feature Extraction + Scoring Agent (Rule-Based NLP)
    NO LLM usage as requested.
    """

    def __init__(self) -> None:
        self._elite_keywords = {
            "stanford": 1.0, "mit": 1.0, "harvard": 1.0, "cambridge": 0.9,
            "oxford": 0.9, "caltech": 0.9, "berkeley": 0.85, "cmu": 0.85,
        }

    # Common tech aliases for semantic matching without an LLM
    _ALIASES: Dict[str, str] = {
        "ml": "machine learning", "dl": "deep learning", "ai": "artificial intelligence",
        "js": "javascript", "ts": "typescript", "py": "python", "cpp": "c++",
        "k8s": "kubernetes", "tf": "tensorflow", "pt": "pytorch",
        "nlp": "natural language processing", "cv": "computer vision",
        "db": "database", "ui": "user interface", "ux": "user experience",
        "react.js": "react", "reactjs": "react", "nodejs": "node.js",
        "vue.js": "vue", "vuejs": "vue", "angular.js": "angular",
        "mongo": "mongodb", "postgres": "postgresql",
        "aws": "amazon web services", "gcp": "google cloud",
    }

    def _normalize(self, s: str) -> str:
        s = s.strip().lower()
        return self._ALIASES.get(s, s)

    def extract_and_score(
        self,
        *,
        cv_skills: List[str],
        experience_years: float,
        projects_count: int,
        certifications_count: int,
        cgpa: Optional[float],
        institute: Optional[str],
        job_required_skills: List[Dict[str, Any]],
        include_institute_bias: bool,
    ) -> FeatureResult:
        have_raw = [s.strip().lower() for s in (cv_skills or []) if s.strip()]
        have = [self._normalize(s) for s in have_raw]
        required_objs = job_required_skills or []

        matched = []
        missing = []
        total_required_weight = 0
        earned_weight = 0
        required_names = []

        for req in required_objs:
            req_dict = {"skill": req, "weight": 5} if isinstance(req, str) else req
            orig_skill = req_dict.get("skill", "")
            skill_name = self._normalize(orig_skill.strip().lower())
            if not skill_name:
                continue

            required_names.append(skill_name)
            weight = req_dict.get("weight", 5)
            total_required_weight += weight

            # Bidirectional partial match + alias match
            is_matched = any(
                skill_name in h or h in skill_name or
                self._normalize(skill_name) == self._normalize(h)
                for h in have
            )

            if is_matched:
                matched.append(orig_skill)
                earned_weight += weight
            else:
                missing.append(orig_skill)

        # 0-100 scaling
        skills_score = (earned_weight / total_required_weight * 100.0) if total_required_weight > 0 else (100.0 if not required_objs else 0.0)
        exp_score = min(max(experience_years, 0.0), 10.0) / 10.0 * 100.0
        proj_score = min(max(projects_count, 0), 6) / 6.0 * 100.0
        cert_score = min(max(certifications_count, 0), 6) / 6.0 * 100.0
        cgpa_score = 0.0 if cgpa is None else min(max(cgpa, 0.0), 4.0) / 4.0 * 100.0

        institute_bias = self._institute_bias_adjustment(institute) if include_institute_bias else 0.0

        total = (0.30 * exp_score + 0.25 * skills_score + 0.20 * proj_score + 0.15 * cert_score + 0.10 * cgpa_score + institute_bias)
        total = float(max(0.0, min(100.0, total)))

        similarity = self._jaccard_similarity(set(have), set(required_names))

        return FeatureResult(
            skills_matched=matched,
            missing_skills=missing,
            years_experience=float(experience_years),
            projects_count=int(projects_count),
            certifications_count=int(certifications_count),
            cgpa=cgpa,
            institute=institute,
            similarity_to_job=float(round(similarity * 100.0, 2)),
            score_breakdown=ScoreBreakdown(
                experience=float(round(0.30 * exp_score, 2)),
                skills=float(round(0.25 * skills_score, 2)),
                projects=float(round(0.20 * proj_score, 2)),
                certifications=float(round(0.15 * cert_score, 2)),
                cgpa=float(round(0.10 * cgpa_score, 2)),
                institute_bias=float(round(institute_bias, 2)),
                total=float(round(total, 2)),
            ),
        )

    def score_for_job(self, extracted: Dict[str, Any], job_required_skills: List[Dict[str, Any]]) -> FeatureResult:
        """Score a stored CV extraction against one specific job.

        Use this whenever a score drives anything job-related: a CV's stored score was
        computed at upload time against a different job (or none) and is not comparable.
        Institute prestige is never included.
        """
        extracted = extracted or {}
        return self.extract_and_score(
            cv_skills=extracted.get("skills") or [],
            experience_years=float(extracted.get("experience_years") or 0.0),
            projects_count=int(extracted.get("projects_count") or 0),
            certifications_count=int(extracted.get("certifications_count") or 0),
            cgpa=extracted.get("cgpa"),
            institute=extracted.get("education_institute"),
            job_required_skills=job_required_skills or [],
            include_institute_bias=False,
        )

    def _institute_bias_adjustment(self, institute: Optional[str]) -> float:
        if not institute: return -6.0
        s = institute.lower()
        for k, w in self._elite_keywords.items():
            if k in s: return 8.0 * w
        return -4.0

    def _jaccard_similarity(self, a: set, b: set) -> float:
        if not a and not b: return 1.0
        if not a or not b: return 0.0
        return len(a & b) / max(1, len(a | b))
