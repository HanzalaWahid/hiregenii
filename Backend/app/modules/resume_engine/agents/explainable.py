from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from .scoring import FeatureResult
from .llm_router import LLMRouter
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
import json
import logging

logger = logging.getLogger(__name__)

PENDING_DECISION = "Pending"


@dataclass(frozen=True)
class Explanation:
    decision: str
    score: float
    reason: str
    score_breakdown: Dict[str, float]
    feature_contributions: Dict[str, str]
    missing_skills: List[str]
    suggestions: List[str]
    bias_indicator: bool
    bias_insight: Optional[str]


class ExplainableAIAgent:
    """
    Agent 5: Explainable AI Agent (Rule-Based)
    This implementation will attempt to use Groq via the centralized `LLMRouter` to
    produce a more focused, job-specific explanation. If the LLM path fails or
    validation detects hallucination, it falls back to the original rule-based logic.
    """

    def explain(
        self,
        *,
        features: FeatureResult,
        decision_threshold: float,
        view: str,
        audience: str,
        actual_decision: Optional[str] = None,
        job_title: Optional[str] = None,
        required_skills: Optional[List[str]] = None,
    ) -> Explanation:
        # Core rule-based data (kept for fallback and for LLM context)
        score = features.score_breakdown.total

        # The AI never decides. Unless a human decision is passed in, the explanation is a
        # "Pending" match assessment: no verdict for the seeker, an advisory note for the recruiter.
        is_pending = not actual_decision or actual_decision.strip().lower() == "pending"
        if is_pending:
            decision = PENDING_DECISION
            meets_threshold = score >= decision_threshold
            return self._pending_explanation(features, decision_threshold, meets_threshold, view, audience, job_title)

        decision = actual_decision
        selected = decision.lower() in {"selected", "shortlisted"}

        bias_indicator = bool(view == "normal" and abs(features.score_breakdown.institute_bias) >= 4.0)

        breakdown = {
            "experience": features.score_breakdown.experience,
            "skills": features.score_breakdown.skills,
            "projects": features.score_breakdown.projects,
            "certifications": features.score_breakdown.certifications,
            "cgpa": features.score_breakdown.cgpa,
            "institute_bias": features.score_breakdown.institute_bias,
            "total": features.score_breakdown.total,
        }

        contributions = {
            "experience": f"{features.years_experience:.1f} years of relevant experience.",
            "skills": f"{len(features.skills_matched)} required skills matched.",
            "projects": f"{features.projects_count} projects showcased.",
            "certifications": f"{features.certifications_count} professional certifications.",
            "cgpa": "Academic excellence considered." if features.cgpa and features.cgpa > 3.0 else "CGPA not a major factor.",
            "institute_bias": "Institute prestige factor included." if bias_indicator else "No institute bias applied.",
        }

        suggestions = self._get_suggestions(features)

        # Build structured context for Groq LLM
        llm_context = {
            "features": {
                "skills_matched": features.skills_matched,
                "missing_skills": features.missing_skills,
                "years_experience": features.years_experience,
                "projects_count": features.projects_count,
                "certifications_count": features.certifications_count,
                "cgpa": features.cgpa,
                "institute": features.institute,
                "similarity_to_job": features.similarity_to_job,
                "score_breakdown": breakdown,
            },
            "decision_threshold": decision_threshold,
            "selected": selected,
            "decision": decision,
            "view": view,
            "audience": audience,
            "job_title": job_title,
        }

        # Try Groq via the centralized LLM router, with a short timeout.
        try:
            llm_result = self._call_groq_explain(llm_context, timeout=6)
            if llm_result and self._validate_llm_explanation(llm_result, features):
                # Map LLM result into Explanation dataclass (ensure types)
                logger.debug(f"✓ [Explainable AI] Using Groq LLM explanation for audience={audience}")
                return Explanation(
                    decision=str(llm_result.get("decision", decision)),
                    score=float(llm_result.get("score", float(round(score, 2)))),
                    reason=str(llm_result.get("reason", self._get_seeker_rejection_reason(features, threshold=decision_threshold, job_title=job_title) if not selected else self._get_seeker_selected_reason(features, job_title))),
                    score_breakdown=llm_result.get("score_breakdown", breakdown),
                    feature_contributions=llm_result.get("feature_contributions", contributions),
                    missing_skills=list(llm_result.get("missing_skills", features.missing_skills[:6])),
                    suggestions=list(llm_result.get("suggestions", suggestions)),
                    bias_indicator=bool(llm_result.get("bias_indicator", bias_indicator)),
                    bias_insight=llm_result.get("bias_insight", "Decision potentially influenced by institutional prestige." if bias_indicator else None),
                )
        except Exception as e:
            # Any failure in LLM path will fall back to local explainable logic below.
            logger.debug(f"⚠ [Explainable AI] LLM path failed: {e}. Using local fallback.")
            pass

        # Fallback: existing rule-based explanation (kept unchanged)
        logger.debug(f"↻ [Explainable AI] Using fallback rule-based explanation for audience={audience}")

        if audience == "seeker":
            reason = (
                self._get_seeker_selected_reason(features, job_title)
                if selected
                else self._get_seeker_rejection_reason(features, threshold=decision_threshold, job_title=job_title)
            )
        else:
            reason = self._get_recruiter_reason(features, selected, job_title=job_title)

        bias_insight = "Decision potentially influenced by institutional prestige." if bias_indicator else None

        suggestions = suggestions or ["Continue refining your technical skills and building hands-on projects."]
        if not reason or not reason.strip():
            reason = f"Based on your profile match of {score:.0f}%, you are currently {'a strong candidate' if selected else 'developing the specialized skills'} for the {job_title or 'requested'} role."

        return Explanation(
            decision=decision,
            score=float(round(score, 2)),
            reason=reason,
            score_breakdown=breakdown,
            feature_contributions=contributions,
            missing_skills=features.missing_skills[:6],
            suggestions=suggestions,
            bias_indicator=bias_indicator,
            bias_insight=bias_insight,
        )

    def _call_groq_explain(self, context: Dict[str, Any], timeout: int = 6) -> Optional[Dict[str, Any]]:
        """
        Call the LLM router to get a structured explanation. Uses a short thread executor to enforce timeout.
        Returns parsed JSON dict or None.
        """
        system_prompt = (
            "You are an explainability assistant for shortlisting decisions. "
            "Given the provided structured context, return ONLY a valid JSON object with the following keys:"
            " decision (Selected/Rejected), score (0-100 numeric), reason (concise professional explanation),"
            " score_breakdown (dict of numeric sub-scores), feature_contributions (dict of short descriptions),"
            " missing_skills (list), suggestions (list), bias_indicator (bool), bias_insight (optional string)."
            " Use only facts present in the context; do NOT hallucinate new facts. Keep output concise and job-specific."
        )

        prompt = "Context:\n" + json.dumps(context, indent=2, default=str)

        with ThreadPoolExecutor(max_workers=1) as ex:
            fut = ex.submit(LLMRouter.generate_json, prompt, system_prompt)
            try:
                return fut.result(timeout=timeout)
            except FuturesTimeoutError:
                fut.cancel()
                return None
            except Exception:
                return None

    def _validate_llm_explanation(self, llm_obj: Dict[str, Any], features: FeatureResult) -> bool:
        """
        Basic validation to prevent hallucinations and ensure required fields exist.
        - Must contain decision, score (numeric), reason (str)
        - missing_skills (list) if present should be subset/intersect with features.missing_skills
        """
        try:
            if not isinstance(llm_obj, dict):
                return False
            if "decision" not in llm_obj or "score" not in llm_obj or "reason" not in llm_obj:
                return False
            # score numeric
            _ = float(llm_obj.get("score"))
            # ensure missing skills align
            ms = llm_obj.get("missing_skills", []) or []
            if not isinstance(ms, list):
                return False
            # Allow some slack: at least one missing skill must intersect or the LLM should not invent many skills
            if ms:
                intersection = set([s.lower() for s in ms]) & set([s.lower() for s in features.missing_skills])
                if not intersection:
                    # if LLM provided missing_skills but none match, consider it hallucination
                    return False
            return True
        except Exception:
            return False

    def _pending_explanation(
        self,
        f: FeatureResult,
        threshold: float,
        meets_threshold: bool,
        view: str,
        audience: str,
        job_title: Optional[str],
    ) -> Explanation:
        """Rule-based, verdict-free explanation. The LLM is not used here, so it cannot
        phrase a pending application as accepted or rejected."""
        bias_indicator = bool(view == "normal" and abs(f.score_breakdown.institute_bias) >= 4.0)
        breakdown = {
            "experience": f.score_breakdown.experience,
            "skills": f.score_breakdown.skills,
            "projects": f.score_breakdown.projects,
            "certifications": f.score_breakdown.certifications,
            "cgpa": f.score_breakdown.cgpa,
            "institute_bias": f.score_breakdown.institute_bias,
            "total": f.score_breakdown.total,
        }
        contributions = {
            "experience": f"{f.years_experience:.1f} years of relevant experience.",
            "skills": f"{len(f.skills_matched)} required skills matched.",
            "projects": f"{f.projects_count} projects showcased.",
            "certifications": f"{f.certifications_count} professional certifications.",
            "cgpa": "Academic excellence considered." if f.cgpa and f.cgpa > 3.0 else "CGPA not a major factor.",
            "institute_bias": "Institute prestige factor included." if bias_indicator else "No institute bias applied.",
        }
        if audience == "seeker":
            reason = self._get_seeker_pending_reason(f, job_title)
        else:
            reason = self._get_recruiter_suggestion(f, threshold, meets_threshold, job_title)

        return Explanation(
            decision=PENDING_DECISION,
            score=float(round(f.score_breakdown.total, 2)),
            reason=reason,
            score_breakdown=breakdown,
            feature_contributions=contributions,
            missing_skills=f.missing_skills[:6],
            suggestions=self._get_suggestions(f),
            bias_indicator=bias_indicator,
            bias_insight="Score potentially influenced by institutional prestige." if bias_indicator else None,
        )

    def _get_seeker_pending_reason(self, f: FeatureResult, job_title: Optional[str]) -> str:
        total_required = len(f.skills_matched) + len(f.missing_skills)
        if not job_title and total_required == 0:
            return "Your CV has been analysed. Apply to a job to see how your profile matches its requirements."
        role_str = f" for the {job_title} role" if job_title else ""
        reason = f"Your application{role_str} is awaiting review by the recruiter."
        if total_required:
            reason += f" Your CV matches {len(f.skills_matched)} of {total_required} required skills."
        if f.missing_skills:
            reason += f" Highlighting experience with {', '.join(f.missing_skills[:3])} could strengthen your match."
        return reason

    def _get_recruiter_suggestion(
        self, f: FeatureResult, threshold: float, meets_threshold: bool, job_title: Optional[str]
    ) -> str:
        role_str = f" for the {job_title} role" if job_title else ""
        position = "meets" if meets_threshold else "is below"
        notes = []
        if f.skills_matched:
            notes.append(f"matched skills: {', '.join(f.skills_matched[:3])}")
        if f.missing_skills:
            notes.append(f"missing: {', '.join(f.missing_skills[:3])}")
        if f.years_experience:
            notes.append(f"{f.years_experience:.1f} yrs experience")
        detail = f" ({'; '.join(notes)})" if notes else ""
        return (
            f"AI suggestion{role_str}: match score {f.score_breakdown.total:.1f}/100 {position} the "
            f"{threshold:.0f} review threshold{detail}. Advisory only; the hiring decision is yours."
        )

    def _get_suggestions(self, f: FeatureResult) -> List[str]:
        sug = []
        if f.missing_skills:
            sug.append(f"Learn or highlight: {', '.join(f.missing_skills[:3])}")
        if f.years_experience < 3:
            sug.append("Gain more professional experience in relevant tools.")
        if f.projects_count < 2:
            sug.append("Build more hands-on projects to showcase skills.")
        if not sug:
            sug.append("Keep your profile updated with latest achievements.")
        return sug[:3]

    def _get_seeker_selected_reason(self, f: FeatureResult, job_title: Optional[str]) -> str:
        role_str = f" for the {job_title} role" if job_title else ""
        strengths = []
        if len(f.skills_matched) >= 3:
            strengths.append(f"you matched {len(f.skills_matched)} required skills ({', '.join(f.skills_matched[:3])})")
        if f.years_experience >= 2:
            strengths.append(f"{f.years_experience:.1f} years of relevant experience")
        if f.cgpa and f.cgpa > 3.0:
            strengths.append(f"strong CGPA of {f.cgpa:.2f}")
        if strengths:
            return f"Excellent match{role_str}. You stood out because {', '.join(strengths)}."
        return f"Your overall profile is a strong fit{role_str}."

    def _get_seeker_rejection_reason(self, f: FeatureResult, threshold: float, job_title: Optional[str]) -> str:
        role_str = f" for the {job_title} role" if job_title else ""

        if not f.skills_matched and f.missing_skills:
            top_missing = ", ".join(f.missing_skills[:3])
            return (
                f"Your application{role_str} was unsuccessful because none of the required technical skills "
                f"({top_missing}) were detected in your CV. Ensure these are explicitly listed."
            )

        if f.missing_skills:
            top_missing = ", ".join(f.missing_skills[:3])
            matched_str = ", ".join(f.skills_matched[:2]) if f.skills_matched else "some skills"
            return (
                f"While you demonstrated {matched_str}{role_str}, the recruiter prioritized candidates "
                f"with expertise in {top_missing}. Developing these will significantly improve your match score."
            )

        if f.years_experience < 2:
            return (
                f"Your application{role_str} required more professional experience than was identified in your resume. "
                f"Consider clearly listing all employment durations including internships and part-time roles."
            )

        gap = threshold - f.score_breakdown.total
        return (
            f"Your profile score ({f.score_breakdown.total:.0f}/100) was {gap:.0f} points below the shortlisting "
            f"threshold ({threshold:.0f}) for this role. Improving your skills match and adding more projects can close this gap."
        )

    def _get_recruiter_reason(self, f: FeatureResult, selected: bool, job_title: Optional[str] = None) -> str:
        role_str = f" for the {job_title} role" if job_title else ""

        if selected:
            strengths = []
            if f.years_experience > 4:
                strengths.append(f"{f.years_experience:.1f} yrs relevant experience")
            if f.skills_matched:
                strengths.append(f"{len(f.skills_matched)} matched skills ({', '.join(f.skills_matched[:3])})")
            if f.cgpa and f.cgpa > 3.4:
                strengths.append(f"strong academic background (CGPA {f.cgpa:.2f})")
            if f.projects_count >= 3:
                strengths.append(f"significant project portfolio ({f.projects_count} projects)")
            
            strength_str = f" based on: {', '.join(strengths)}" if strengths else ""
            return f"Candidate selected{role_str}{strength_str}. Overall Match: {f.score_breakdown.total:.1f}%."

        gaps = []
        if not f.skills_matched:
            gaps.append("lack of required technical skills")
        elif f.missing_skills:
            gaps.append(f"missing critical skills: {', '.join(f.missing_skills[:3])}")
        
        if f.years_experience < 2:
            gaps.append(f"limited professional experience ({f.years_experience:.1f} yrs)")
            
        gap_str = f" due to: {', '.join(gaps)}" if gaps else f" (score {f.score_breakdown.total:.1f} below threshold)"
        return f"Candidate not shortlisted{role_str}{gap_str}."
