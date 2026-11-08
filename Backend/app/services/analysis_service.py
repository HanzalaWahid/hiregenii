from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any, Dict, List

from ..ats.engine import RuleBasedATSScorer
from ..config import get_extractor_provider, get_max_upload_size_mb
from ..knowledge.repository import KnowledgeRepository
from ..models import ATSResult, RecommendationResult, ResumeAnalysisResult, ResumeData
from ..parser.cerebras_extractor import CerebrasExtractor
from ..parser.custom_parser import CustomRuleBasedExtractor
from ..parser.llm_extractor import GeminiExtractor
from ..recommendation.engine import RuleBasedRecommendationEngine
from ..validation.validator import validate_resume

logger = logging.getLogger(__name__)

SOFT_SKILL_KEYWORDS = {
    "communication",
    "leadership",
    "teamwork",
    "collaboration",
    "problem solving",
    "critical thinking",
    "stakeholder management",
    "adaptability",
    "time management",
    "mentoring",
    "presentation",
}

SKILL_CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "programming_languages": ["python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "php", "ruby", "swift", "kotlin"],
    "frameworks": ["react", "angular", "vue", "next", "nuxt", "django", "flask", "fastapi", "spring", "laravel", "express"],
    "libraries": ["pandas", "numpy", "scikit", "tensorflow", "pytorch", "keras", "redux", "tailwind", "bootstrap"],
    "databases": ["sql", "mysql", "postgres", "postgresql", "mongodb", "redis", "oracle", "sqlite", "dynamodb"],
    "cloud_platforms": ["aws", "azure", "gcp", "google cloud", "cloud"],
    "ai_ml": ["machine learning", "deep learning", "nlp", "computer vision", "llm", "ai", "ml"],
    "data_science": ["tableau", "power bi", "powerbi", "spark", "hadoop", "statistics", "data analysis", "etl"],
    "devops": ["docker", "kubernetes", "terraform", "ci/cd", "jenkins", "github actions", "ansible", "linux", "devops"],
    "tools": ["git", "jira", "figma", "postman", "selenium", "notion", "slack"],
}


class ResumeAnalysisService:
    """V1 service layer for validation, selected extractor execution, knowledge normalization, ATS scoring, and recommendations."""

    def __init__(self, provider: str | None = None) -> None:
        self.provider = (provider or get_extractor_provider() or "auto").lower()
        self.extractor = self._get_extractor(self.provider)
        self.ats_engine = RuleBasedATSScorer()
        self.recommendation_engine = RuleBasedRecommendationEngine()
        self.knowledge_repo = KnowledgeRepository()

    def _get_extractor(self, provider: str) -> Any:
        provider = provider.lower()
        if provider == "gemini":
            return self._build_gemini_extractor()
        if provider == "cerebras":
            return CerebrasExtractor()
        return CustomRuleBasedExtractor()

    def _build_gemini_extractor(self) -> Any:
        try:
            return GeminiExtractor()
        except Exception as exc:
            logger.warning("Gemini extractor is unavailable in V1 runtime: %s", exc)
            return None

    def validate_file(self, resume_path: Path) -> tuple[bool, list[str]]:
        """Validate the resume file size, signature, and integrity before processing."""
        max_size = get_max_upload_size_mb()
        return validate_resume(resume_path, max_size)

    def analyze_resume(self, resume_path: Path) -> ResumeAnalysisResult:
        provider_used = self.provider if self.provider in {"gemini", "cerebras"} else "custom_rule"
        fallback_used = False
        confidence_score = 0.0

        extracted = self.extractor.extract(resume_path)
        parsed_data = extracted.get("parsed_data", {}) or {}
        raw_text = extracted.get("raw_text", "")
        confidence_score = self._score_extraction_quality(parsed_data, raw_text)

        parsed_data = self._enrich_parsed_data(parsed_data, raw_text)

        # 2. Knowledge Layer: Resolve and normalize skills
        raw_skills = parsed_data.get("skills") or []
        resolved_skills: List[str] = []
        normalized_skill_map: List[Dict[str, Any]] = []
        for skill in raw_skills:
            if not skill:
                continue
            resolved = self.knowledge_repo.resolve_skill(skill)
            resolved_skills.append(resolved)
            normalized_skill_map.append({
                "original": skill,
                "normalized": resolved,
                "category": self._categorize_skill(resolved),
                "confidence": self._skill_confidence(skill),
            })
            if not self.knowledge_repo.is_known_skill(skill):
                self.knowledge_repo.log_unknown_skill(skill)

        parsed_data["skills"] = self._unique_preserve_order(resolved_skills)
        parsed_data["normalized_skill_map"] = normalized_skill_map
        parsed_data["skill_categories"] = self._group_skills(parsed_data["skills"])
        parsed_data["soft_skills"] = [
            skill for skill in parsed_data["skills"]
            if skill.lower() in SOFT_SKILL_KEYWORDS
        ]
        parsed_data["technical_skills"] = [
            skill for skill in parsed_data["skills"]
            if skill.lower() not in {s.lower() for s in parsed_data["soft_skills"]}
        ]

        ats_payload = self.ats_engine.score(parsed_data, raw_text)
        recommendation_payload = self.recommendation_engine.recommend(parsed_data, raw_text)

        resume_data = ResumeData(
            name=parsed_data.get("name"),
            professional_title=parsed_data.get("professional_title") or parsed_data.get("designation"),
            email=parsed_data.get("email"),
            mobile_number=parsed_data.get("mobile_number"),
            address=parsed_data.get("address"),
            linkedin=parsed_data.get("linkedin"),
            github=parsed_data.get("github"),
            portfolio=parsed_data.get("portfolio"),
            website=parsed_data.get("website"),
            skills=parsed_data.get("skills") or [],
            technical_skills=parsed_data.get("technical_skills") or [],
            soft_skills=parsed_data.get("soft_skills") or [],
            skill_categories=parsed_data.get("skill_categories") or {},
            normalized_skill_map=parsed_data.get("normalized_skill_map") or [],
            college_name=parsed_data.get("college_name"),
            degree=parsed_data.get("degree"),
            designation=parsed_data.get("designation"),
            company_names=parsed_data.get("company_names") or [],
            experience=parsed_data.get("experience"),
            experiences=parsed_data.get("experiences") or [],
            total_experience=parsed_data.get("total_experience") or 0.0,
            no_of_pages=parsed_data.get("no_of_pages") or 0,
            projects=parsed_data.get("projects") or [],
            project_details=parsed_data.get("project_details") or [],
            internships=parsed_data.get("internships") or [],
            achievements=parsed_data.get("achievements") or [],
            certifications=parsed_data.get("certifications") or [],
            languages=parsed_data.get("languages") or [],
            awards=parsed_data.get("awards") or [],
            publications=parsed_data.get("publications") or [],
            hobbies=parsed_data.get("hobbies") or [],
            interests=parsed_data.get("interests") or [],
            objective=parsed_data.get("objective"),
            education=parsed_data.get("education"),
            education_entries=parsed_data.get("education_entries") or [],
            summary=parsed_data.get("summary"),
            raw_text=raw_text,
        )

        ats_result = ATSResult(
            score=ats_payload["score"],
            section_coverage=ats_payload["section_coverage"],
            explanations=ats_payload["explanations"],
            keywords_found=ats_payload["keywords_found"],
            sub_scores=ats_payload["sub_scores"],
            detailed_explanations=ats_payload["detailed_explanations"],
        )

        recommendation_result = RecommendationResult(
            predicted_field=recommendation_payload.get("predicted_field"),
            recommended_skills=recommendation_payload.get("recommended_skills") or [],
            recommended_courses=recommendation_payload.get("recommended_courses") or [],
            recommended_videos=recommendation_payload.get("recommended_videos") or [],
            notes=recommendation_payload.get("notes"),
        )

        candidate_level = self._detect_candidate_level(raw_text)

        return ResumeAnalysisResult(
            resume_data=resume_data,
            ats_result=ats_result,
            recommendation=recommendation_result,
            raw_text=raw_text,
            candidate_level=candidate_level,
            provider_used=provider_used,
            fallback_used=fallback_used,
            confidence_score=confidence_score,
        )

    def _score_extraction_quality(self, parsed_data: Dict[str, Any], raw_text: str) -> float:
        score = 0.0
        if parsed_data.get("name"):
            score += 0.15
        if parsed_data.get("email"):
            score += 0.15
        if parsed_data.get("mobile_number"):
            score += 0.1
        if parsed_data.get("professional_title") or parsed_data.get("designation"):
            score += 0.1
        if parsed_data.get("skills"):
            score += 0.15
        if parsed_data.get("experience"):
            score += 0.15
        if parsed_data.get("education"):
            score += 0.1
        if raw_text and len(raw_text.strip()) > 250:
            score += 0.1
        return round(min(score, 1.0), 2)

    def _detect_candidate_level(self, text: str) -> str:
        normalized_text = text.lower()
        if any(keyword in normalized_text for keyword in ["internship", "internships", "trainee"]):
            return "Intermediate"
        if any(keyword in normalized_text for keyword in ["experience", "work experience"]):
            return "Experienced"
        return "Fresher"

    def _enrich_parsed_data(self, parsed_data: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
        enriched = dict(parsed_data)
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

        linkedin, github, portfolio, website = self._extract_links(raw_text)
        address = self._extract_location(lines)
        summary = enriched.get("summary") or self._extract_section(raw_text, ["professional summary", "summary", "profile"])
        experiences = enriched.get("experiences") or self._extract_experiences(raw_text, enriched.get("skills") or [], enriched.get("designation"))
        education_entries = enriched.get("education_entries") or self._extract_education_entries(raw_text)

        enriched["professional_title"] = enriched.get("professional_title") or enriched.get("designation")
        enriched["linkedin"] = enriched.get("linkedin") or linkedin
        enriched["github"] = enriched.get("github") or github
        enriched["portfolio"] = enriched.get("portfolio") or portfolio
        enriched["website"] = enriched.get("website") or website
        enriched["address"] = enriched.get("address") or address
        enriched["summary"] = summary

        enriched["projects"] = self._safe_list(
            enriched.get("projects")
            or self._extract_bullets(self._extract_section(raw_text, ["projects", "project"]))
        )
        enriched["project_details"] = self._build_project_details(enriched["projects"], enriched.get("skills") or [])
        enriched["certifications"] = self._safe_list(
            enriched.get("certifications")
            or self._extract_bullets(self._extract_section(raw_text, ["certifications", "certificates", "licenses"]))
        )
        enriched["languages"] = self._safe_list(
            enriched.get("languages")
            or self._extract_languages(raw_text)
        )
        enriched["awards"] = self._safe_list(
            enriched.get("awards")
            or self._extract_bullets(self._extract_section(raw_text, ["awards", "honors", "achievements"]))
        )
        enriched["publications"] = self._safe_list(
            enriched.get("publications")
            or self._extract_bullets(self._extract_section(raw_text, ["publications", "research", "papers"]))
        )

        if not enriched.get("interests"):
            enriched["interests"] = self._safe_list(
                self._extract_bullets(self._extract_section(raw_text, ["interests", "hobbies"]))
            )

        enriched["experiences"] = experiences
        if experiences and not enriched.get("company_names"):
            enriched["company_names"] = self._unique_preserve_order([
                item.get("company", "") for item in experiences if item.get("company")
            ])
        if experiences and not enriched.get("designation"):
            enriched["designation"] = experiences[0].get("position")

        if not enriched.get("education") and education_entries:
            enriched["education"] = "\n".join(
                f"{entry.get('degree', '').strip()} - {entry.get('institution', '').strip()}".strip(" -")
                for entry in education_entries
            )

        if education_entries and not enriched.get("degree"):
            enriched["degree"] = education_entries[0].get("degree")
        if education_entries and not enriched.get("college_name"):
            enriched["college_name"] = education_entries[0].get("institution")

        enriched["education_entries"] = education_entries

        return enriched

    def _extract_links(self, text: str) -> tuple[str | None, str | None, str | None, str | None]:
        lowered = text.lower()
        urls = re.findall(r"(?:https?://|www\.)[^\s)>,]+", text)

        linkedin = next((u for u in urls if "linkedin.com" in u.lower()), None)
        github = next((u for u in urls if "github.com" in u.lower()), None)

        non_social = [u for u in urls if "linkedin.com" not in u.lower() and "github.com" not in u.lower()]
        portfolio = next((u for u in non_social if any(tag in lowered for tag in ["portfolio", "personal site", "website"])), None)
        website = non_social[0] if non_social else None

        return linkedin, github, portfolio, website

    def _extract_location(self, lines: List[str]) -> str | None:
        location_regexes = [
            re.compile(r"\b(remote|hybrid|onsite)\b", re.IGNORECASE),
            re.compile(r"\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2,}\b"),
            re.compile(r"\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z][a-z]+\b"),
        ]
        for line in lines[:15]:
            if any(token in line.lower() for token in ["linkedin", "github", "@", "http"]):
                continue
            for regex in location_regexes:
                match = regex.search(line)
                if match:
                    return match.group(0)
        return None

    def _extract_section(self, text: str, headers: List[str]) -> str:
        lines = text.splitlines()
        start_index = -1
        for i, line in enumerate(lines):
            normalized = line.strip().lower().rstrip(":")
            if normalized in headers:
                start_index = i + 1
                break
            if len(normalized) < 45 and any(normalized.startswith(h) for h in headers):
                start_index = i + 1
                break

        if start_index == -1:
            return ""

        section_lines: List[str] = []
        for line in lines[start_index:]:
            stripped = line.strip()
            if not stripped:
                if section_lines:
                    section_lines.append("")
                continue
            lowered = stripped.lower().rstrip(":")
            if len(stripped) < 45 and lowered in {
                "experience", "work experience", "education", "projects", "skills", "certifications", "awards", "publications", "languages", "interests", "hobbies"
            }:
                break
            section_lines.append(stripped)
        return "\n".join(section_lines).strip()

    def _extract_bullets(self, text: str) -> List[str]:
        if not text:
            return []
        chunks = re.split(r"\n|\u2022|•|\-|\*", text)
        cleaned = [chunk.strip() for chunk in chunks if len(chunk.strip()) > 2]
        return self._unique_preserve_order(cleaned)

    def _extract_experiences(self, raw_text: str, skills: List[str], fallback_position: str | None) -> List[Dict[str, Any]]:
        section = self._extract_section(raw_text, ["experience", "work experience", "professional experience", "employment history", "work history"])
        if not section:
            return []

        blocks = [block.strip() for block in re.split(r"\n\s*\n", section) if block.strip()]
        if len(blocks) == 1:
            blocks = [blk.strip() for blk in re.split(r"(?=\b(?:20\d{2}|19\d{2})\b)", section) if blk.strip()]

        experiences: List[Dict[str, Any]] = []
        date_pattern = re.compile(r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4})\s*(?:-|to|–|—)\s*(Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4})", re.IGNORECASE)
        quant_pattern = re.compile(r"\b\d+(?:\.\d+)?\s*(?:%|percent|k|m|million|billion|hours|days|months|years|x)\b", re.IGNORECASE)

        normalized_skill_lookup = {s.lower(): s for s in skills}

        for block in blocks:
            lines = [line.strip("-•* \t") for line in block.splitlines() if line.strip()]
            if not lines:
                continue

            position = lines[0]
            company = ""
            employment_period = ""
            location = ""

            date_match = date_pattern.search(block)
            if date_match:
                employment_period = date_match.group(0)

            for line in lines[:3]:
                company_match = re.search(r"(?:at|@)\s+([A-Za-z0-9&,.\-\s]{2,})", line, re.IGNORECASE)
                if company_match:
                    company = company_match.group(1).strip(" -|,")
                if not company and any(token in line.lower() for token in ["inc", "ltd", "llc", "corp", "technologies", "solutions", "company"]):
                    company = line.strip()
                if not location:
                    loc_match = re.search(r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2,}|Remote|Hybrid|Onsite)\b", line, re.IGNORECASE)
                    if loc_match:
                        location = loc_match.group(1)

            responsibility_lines: List[str] = []
            achievement_lines: List[str] = []
            block_lower = block.lower()
            technologies_used = [label for k, label in normalized_skill_lookup.items() if re.search(rf"\b{re.escape(k)}\b", block_lower)]

            for line in lines[1:]:
                if quant_pattern.search(line) or any(v in line.lower() for v in ["increased", "reduced", "improved", "optimized", "saved", "led", "grew"]):
                    achievement_lines.append(line)
                else:
                    responsibility_lines.append(line)

            experiences.append({
                "company": company,
                "position": position or fallback_position,
                "employment_period": employment_period,
                "location": location,
                "responsibilities": self._unique_preserve_order(responsibility_lines),
                "achievements": self._unique_preserve_order(achievement_lines),
                "technologies_used": self._unique_preserve_order(technologies_used),
            })

        return experiences

    def _extract_education_entries(self, raw_text: str) -> List[Dict[str, Any]]:
        section = self._extract_section(raw_text, ["education", "academic background", "academics", "academic qualifications"])
        if not section:
            return []

        blocks = [block.strip() for block in re.split(r"\n\s*\n", section) if block.strip()]
        if not blocks:
            blocks = [section]

        degree_pattern = re.compile(r"\b(B\.?\s?Sc|M\.?\s?Sc|B\.?\s?E|M\.?\s?E|B\.?\s?Tech|M\.?\s?Tech|Bachelors?|Masters?|Ph\.?D|MBA|BS|MS)\b", re.IGNORECASE)
        date_pattern = re.compile(r"\b(?:19|20)\d{2}\b(?:\s*(?:-|to|–|—)\s*(?:Present|Current|(?:19|20)\d{2}))?", re.IGNORECASE)
        gpa_pattern = re.compile(r"\b(?:GPA|CGPA)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", re.IGNORECASE)

        results: List[Dict[str, Any]] = []
        for block in blocks:
            lines = [line.strip("-•* \t") for line in block.splitlines() if line.strip()]
            text = " ".join(lines)
            degree_match = degree_pattern.search(text)
            date_match = date_pattern.search(text)
            gpa_match = gpa_pattern.search(text)

            institution = ""
            for line in lines:
                if any(w in line.lower() for w in ["university", "college", "institute", "school"]):
                    institution = line
                    break

            coursework: List[str] = []
            coursework_text = self._extract_section(block, ["relevant coursework", "coursework"])
            if coursework_text:
                coursework = [item.strip() for item in re.split(r",|\n", coursework_text) if item.strip()]

            results.append({
                "degree": degree_match.group(0) if degree_match else (lines[0] if lines else ""),
                "institution": institution,
                "dates": date_match.group(0) if date_match else "",
                "gpa": gpa_match.group(1) if gpa_match else "",
                "coursework": coursework,
            })

        return results

    def _extract_languages(self, raw_text: str) -> List[str]:
        section = self._extract_section(raw_text, ["languages", "language proficiency"])
        if section:
            return [item.strip() for item in re.split(r",|\n|•", section) if item.strip()]
        return []

    def _build_project_details(self, projects: List[str], skills: List[str]) -> List[Dict[str, Any]]:
        details: List[Dict[str, Any]] = []
        for project in projects:
            text = project.strip()
            project_lower = text.lower()
            technologies = [skill for skill in skills if skill.lower() in project_lower]
            details.append({
                "name": text.split(":", 1)[0][:120],
                "description": text,
                "technologies": self._unique_preserve_order(technologies),
            })
        return details

    def _safe_list(self, value: Any) -> List[str]:
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
        if isinstance(value, str) and value.strip():
            return [item.strip() for item in re.split(r",|\n|•", value) if item.strip()]
        return []

    def _unique_preserve_order(self, values: List[str]) -> List[str]:
        seen = set()
        ordered: List[str] = []
        for value in values:
            cleaned = str(value).strip()
            if not cleaned:
                continue
            key = cleaned.lower()
            if key in seen:
                continue
            seen.add(key)
            ordered.append(cleaned)
        return ordered

    def _skill_confidence(self, skill: str) -> float:
        raw = skill.strip().lower()
        if raw in self.knowledge_repo.alias_map:
            return 0.98
        if self.knowledge_repo.is_known_skill(skill):
            return 0.9
        return 0.7

    def _categorize_skill(self, skill: str) -> str:
        normalized = skill.lower().strip()
        if normalized in SOFT_SKILL_KEYWORDS:
            return "soft_skills"
        for category, keywords in SKILL_CATEGORY_KEYWORDS.items():
            if any(keyword in normalized for keyword in keywords):
                return category
        return "tools"

    def _group_skills(self, skills: List[str]) -> Dict[str, List[str]]:
        grouped: Dict[str, List[str]] = {
            "programming_languages": [],
            "frameworks": [],
            "libraries": [],
            "databases": [],
            "cloud_platforms": [],
            "ai_ml": [],
            "data_science": [],
            "devops": [],
            "tools": [],
            "soft_skills": [],
        }
        for skill in skills:
            category = self._categorize_skill(skill)
            grouped[category].append(skill)
        return {k: self._unique_preserve_order(v) for k, v in grouped.items()}
