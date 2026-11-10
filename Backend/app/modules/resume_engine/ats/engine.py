from __future__ import annotations

import logging
import re
from typing import Any, Dict, List

from .interfaces import ATSScorer
from ..config import get_field_rules

logger = logging.getLogger(__name__)

SECTION_RULES: Dict[str, Dict[str, Any]] = {
    "objective": {
        "keywords": ["objective", "summary", "profile", "about me"],
        "points": 6,
        "description": "Objective or summary section",
    },
    "education": {
        "keywords": ["education", "school", "college", "academic", "university"],
        "points": 12,
        "description": "Education section",
    },
    "experience": {
        "keywords": ["experience", "work experience", "employment", "history", "work history"],
        "points": 16,
        "description": "Experience section",
    },
    "internships": {
        "keywords": ["internship", "internships", "trainee", "training"],
        "points": 6,
        "description": "Internship section",
    },
    "skills": {
        "keywords": ["skills", "skill", "technologies", "expertise"],
        "points": 7,
        "description": "Skills section",
    },
    "hobbies": {
        "keywords": ["hobbies", "hobbies"],
        "points": 4,
        "description": "Hobbies section",
    },
    "interests": {
        "keywords": ["interests", "interest"],
        "points": 5,
        "description": "Interests section",
    },
    "achievements": {
        "keywords": ["achievements", "achievements", "awards", "award", "honor", "honors"],
        "points": 13,
        "description": "Achievements section",
    },
    "certifications": {
        "keywords": ["certifications", "certification", "certifications"],
        "points": 12,
        "description": "Certifications section",
    },
    "projects": {
        "keywords": ["projects", "project"],
        "points": 19,
        "description": "Projects section",
    },
}


class RuleBasedATSScorer(ATSScorer):
    """
    Advanced explainable ATS Scorer. Evaluates:
    - Contact info (email, mobile, LinkedIn/GitHub profiles)
    - Experience detail (durations, action verbs, quantified achievements)
    - Education detail (degrees, college names)
    - Projects detail
    - Technical skills detail
    - Layout formatting
    - Semantic keyword overlaps
    """

    def score(self, resume_data: Dict[str, Any], text: str) -> Dict[str, Any]:
        normalized_text = text.lower() if text else ""
        
        # 1. Sub-Score: Contact (Max 10)
        contact_score = 0
        explanations: List[str] = []
        
        if resume_data.get("email"):
            contact_score += 4
        else:
            explanations.append("Missing email address.")
            
        if resume_data.get("mobile_number"):
            contact_score += 3
        else:
            explanations.append("Missing mobile number.")
            
        if "linkedin.com" in normalized_text or "github.com" in normalized_text:
            contact_score += 3
        else:
            explanations.append("Missing professional links (LinkedIn or GitHub).")
            
        if contact_score == 10:
            explanations.append("Strong contact section containing email, mobile, and professional links.")

        # 2. Sub-Score: Experience (Max 20)
        experience_score = 0
        exp_text = resume_data.get("experience") or ""
        total_years = resume_data.get("total_experience") or 0.0
        
        if exp_text:
            experience_score += 5
            
        if total_years > 0:
            if total_years >= 5:
                experience_score += 10
            elif total_years >= 3:
                experience_score += 8
            elif total_years >= 1:
                experience_score += 6
            else:
                experience_score += 4
                
        # Check for quantified achievements (percentages, numbers, dollar values, increase/decrease metrics)
        has_quantified = False
        if exp_text:
            metrics_regex = re.compile(r'\b\d+(?:\.\d+)?\s*(?:%|percent|M|k|million|thousand|usd|dollars)\b', re.IGNORECASE)
            action_verbs = ["increased", "decreased", "saved", "improved", "optimized", "reduced", "led", "managed", "built"]
            if metrics_regex.search(exp_text) or any(verb in exp_text.lower() for verb in action_verbs):
                experience_score += 5
                has_quantified = True
                
        if has_quantified:
            explanations.append("Excellent use of quantified accomplishments and action verbs in work history.")
        else:
            if exp_text:
                explanations.append("Experience section detected, but lacks quantifiable accomplishments (e.g., %, sales increase, budgets).")
            else:
                explanations.append("Missing detailed work experience section.")

        # 3. Sub-Score: Education (Max 15)
        education_score = 0
        edu_text = resume_data.get("education") or ""
        degree = resume_data.get("degree")
        college = resume_data.get("college_name")
        
        if edu_text or college or degree:
            education_score += 5
        if degree:
            education_score += 5
        if college:
            education_score += 5
            
        if education_score >= 10:
            explanations.append("Detailed education section with degree or institution specified.")
        else:
            explanations.append("Education details are minimal or missing degree/college details.")

        # 4. Sub-Score: Projects (Max 20)
        projects_score = 0
        projects_list = resume_data.get("projects") or []
        
        if projects_list:
            projects_score += 8
            count = len(projects_list)
            if count >= 3:
                projects_score += 12
            elif count == 2:
                projects_score += 8
            else:
                projects_score += 4
                
        if len(projects_list) >= 3:
            explanations.append("Strong projects section highlighting 3 or more key implementations.")
        elif projects_list:
            explanations.append("Projects section is present but could be expanded to include more examples.")
        else:
            explanations.append("No projects section detected. Adding side projects or academic work is recommended.")

        # 5. Sub-Score: Skills (Max 20)
        skills_score = 0
        skills_list = resume_data.get("skills") or []
        
        if skills_list:
            count = len(skills_list)
            if count >= 15:
                skills_score += 20
            elif count >= 10:
                skills_score += 15
            elif count >= 5:
                skills_score += 10
            else:
                skills_score += 5
                
        if len(skills_list) >= 10:
            explanations.append(f"Strong professional skill set with {len(skills_list)} technical keyword matches.")
        elif skills_list:
            explanations.append("Skills section present, but recommend listing more technical/core skills.")
        else:
            explanations.append("No skills extracted. Ensure technical skills are clearly formatted.")

        # 6. Sub-Score: Formatting (Max 5)
        formatting_score = 0
        section_coverage: Dict[str, bool] = {}
        for section_name, rule in SECTION_RULES.items():
            matched = any(keyword in normalized_text for keyword in rule["keywords"])
            section_coverage[section_name] = matched
            
        covered_count = sum(1 for val in section_coverage.values() if val)
        if covered_count >= 7:
            formatting_score += 5
        elif covered_count >= 5:
            formatting_score += 4
        elif covered_count >= 3:
            formatting_score += 3
        else:
            formatting_score += 2
            
        if formatting_score == 5:
            explanations.append("Great resume layout formatting with all major sections included.")
        else:
            explanations.append("Layout formatting can be improved by adding standard headings like Certifications, Projects, Hobbies.")

        # 7. Sub-Score: Keyword Match & Semantic Similarity (Max 10)
        keyword_match_score = 0
        matched_keywords: List[str] = []
        
        # Load rules to check semantic matching
        try:
            rules = get_field_rules()
            skills_lower = [s.lower() for s in skills_list]
            
            # Find the best matching job field based on skills list
            best_field = None
            max_matches = 0
            for field_name, keywords in rules.items():
                # Semantic mapping / direct overlap helper
                matches = [k for k in keywords if self._semantic_match(k, skills_lower)]
                if len(matches) > max_matches:
                    max_matches = len(matches)
                    best_field = field_name
                    matched_keywords = matches
                    
            if best_field:
                # Calculate score based on ratio of matched keywords to expectation
                ratio = max_matches / len(rules[best_field])
                keyword_match_score = min(10, int(ratio * 10) + 4)
                explanations.append(f"Good keyword alignment for career track in '{best_field.replace('_', ' ').title()}'.")
            else:
                keyword_match_score = 2
                explanations.append("No specific career field alignment detected in keywords.")
        except Exception as e:
            logger.error("Failed semantic keyword matching: %s", e)
            keyword_match_score = 5

        # Capping sub-scores
        sub_scores = {
            "contact": contact_score,
            "experience": experience_score,
            "education": education_score,
            "projects": projects_score,
            "skills": skills_score,
            "formatting": formatting_score,
            "keyword_match": keyword_match_score
        }
        
        # Overall Score
        overall = sum(sub_scores.values())
        if overall > 100:
            overall = 100

        # Construct legacy compatibility lists
        legacy_explanations: List[Dict[str, Any]] = []
        for sec, val in section_coverage.items():
            legacy_explanations.append({
                "section": sec,
                "matched": val,
                "points": SECTION_RULES.get(sec, {}).get("points", 0) if val else 0,
                "description": SECTION_RULES.get(sec, {}).get("description", "")
            })

        return {
            "score": overall, # overall maps here for compatibility
            "sub_scores": sub_scores,
            "section_coverage": section_coverage,
            "explanations": legacy_explanations,
            "detailed_explanations": explanations,
            "keywords_found": sorted(list(set(matched_keywords))) if matched_keywords else []
        }

    def _semantic_match(self, rule_kw: str, candidate_skills: List[str]) -> bool:
        """
        Custom lightweight semantic matching that handles aliases and stems.
        E.g. matches 'react' to 'reactjs' or 'ml' to 'machine learning'.
        """
        kw = rule_kw.lower().strip()
        synonyms = {
            "react": ["reactjs", "react.js", "react js"],
            "node": ["nodejs", "node.js", "node js"],
            "machine learning": ["ml", "machinelearning"],
            "deep learning": ["dl", "deeplearning"],
            "tensorflow": ["tf"],
            "aws": ["amazon web services"],
            "gcp": ["google cloud", "google cloud platform"],
            "ux": ["ui/ux", "ui-ux", "user experience"],
            "ui": ["ui/ux", "ui-ux", "user interface"]
        }
        
        # Exact match
        if kw in candidate_skills:
            return True
            
        # Stem/substring match
        for cand in candidate_skills:
            if kw in cand or cand in kw:
                return True
                
        # Synonym expansion check
        if kw in synonyms:
            for syn in synonyms[kw]:
                if syn in candidate_skills:
                    return True
        return False
