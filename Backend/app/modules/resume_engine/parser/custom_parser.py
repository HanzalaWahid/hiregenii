from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import PyPDF2
import spacy

from .interfaces import ResumeExtractor
from .text_extraction import extract_text
from ..config import get_field_rules

logger = logging.getLogger(__name__)


class CustomRuleBasedExtractor(ResumeExtractor):
    """
    A custom rule-based and SpaCy-assisted resume extractor.
    Replaces the pyresparser dependency with cleaner, customizable extraction logic.
    """

    def __init__(self) -> None:
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except Exception as e:
            logger.warning("Failed to load SpaCy model 'en_core_web_sm'. Trying a fallback load: %s", e)
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except Exception:
                self.nlp = None

    def extract(self, resume_path: Path) -> Dict[str, Any]:
        raw_text = extract_text(resume_path)
        if not raw_text:
            return {"parsed_data": {}, "raw_text": ""}

        # Count Pages
        no_of_pages = self._get_page_count(resume_path, raw_text)

        # Pre-process text: split into lines
        lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
        cleaned_text_single_line = " ".join(raw_text.split())

        # Extract contact information
        email = self._extract_email(cleaned_text_single_line)
        mobile_number = self._extract_mobile(cleaned_text_single_line)
        linkedin = self._extract_url(cleaned_text_single_line, "linkedin.com")
        github = self._extract_url(cleaned_text_single_line, "github.com")
        website = self._extract_website(cleaned_text_single_line)
        address = self._extract_location(lines)

        # Detect Sections
        sections = self._detect_sections(lines)

        # Extract fields based on sections and raw text
        skills = self._extract_skills(raw_text)
        name = self._extract_name(lines[:10], cleaned_text_single_line)

        # Extract entities using SpaCy or section context
        degree = self._extract_degree(sections.get("education", ""))
        college_name = self._extract_college(sections.get("education", ""), cleaned_text_single_line)
        company_names = self._extract_companies(sections.get("experience", ""))
        designation = self._extract_designation(sections.get("experience", ""), cleaned_text_single_line)

        # Format and normalize parsed data
        parsed_data = {
            "name": name,
            "email": email,
            "mobile_number": mobile_number,
            "linkedin": linkedin,
            "github": github,
            "website": website,
            "portfolio": website,
            "address": address,
            "skills": skills,
            "college_name": college_name,
            "degree": degree,
            "designation": designation,
            "professional_title": designation,
            "company_names": company_names,
            "experience": sections.get("experience"),
            "total_experience": self._parse_total_experience(sections.get("experience", "")),
            "no_of_pages": no_of_pages,
            "projects": self._split_section_items(sections.get("projects")),
            "internships": self._split_section_items(sections.get("internships")),
            "achievements": self._split_section_items(sections.get("achievements")),
            "hobbies": self._split_section_items(sections.get("hobbies")),
            "interests": self._split_section_items(sections.get("interests")),
            "certifications": self._split_section_items(sections.get("certifications")),
            "languages": self._split_section_items(sections.get("languages")),
            "awards": self._split_section_items(sections.get("achievements")),
            "publications": self._split_section_items(sections.get("publications")),
            "objective": sections.get("objective") or sections.get("summary"),
            "education": sections.get("education"),
            "summary": sections.get("summary"),
        }

        return {
            "parsed_data": parsed_data,
            "raw_text": raw_text,
        }

    def _get_page_count(self, file_path: Path, raw_text: str) -> int:
        if file_path.suffix.lower() == '.pdf':
            try:
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    return len(reader.pages)
            except Exception:
                pass
        return max(1, len(raw_text) // 2500)

    def _extract_email(self, text: str) -> Optional[str]:
        match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
        return match.group(0) if match else None

    def _extract_mobile(self, text: str) -> Optional[str]:
        # Matches formats like +1-234-567-8901, 0312-4567890, +923124567890, etc.
        pattern = re.compile(r'\+?\d[\d\s\-()]{8,14}\d')
        matches = pattern.findall(text)
        for match in matches:
            clean = re.sub(r'\D', '', match)
            if 10 <= len(clean) <= 14:
                return match
        return None

    def _detect_sections(self, lines: List[str]) -> Dict[str, str]:
        """Split the resume lines into standard sections."""
        section_keywords = {
            "objective": ["objective", "career goal", "career objective", "aim"],
            "summary": ["summary", "profile summary", "about me", "professional summary"],
            "education": ["education", "academic background", "academic qualifications", "schooling", "university", "college"],
            "experience": ["experience", "work experience", "employment history", "professional experience", "work history"],
            "projects": ["projects", "academic projects", "key projects", "personal projects"],
            "skills": ["skills", "technical skills", "technologies", "expertise", "core competencies"],
            "achievements": ["achievements", "awards", "honors", "accomplishments"],
            "hobbies": ["hobbies", "interests", "activities", "extracurriculars"],
            "internships": ["internships", "internship", "industrial training"],
            "certifications": ["certifications", "certification", "licenses"],
            "languages": ["languages", "language proficiency"],
            "publications": ["publications", "research", "papers"],
        }

        detected: Dict[str, List[str]] = {key: [] for key in section_keywords}
        current_section: Optional[str] = None

        for line in lines:
            # Check if line matches a section header
            header_detected = False
            for sec_name, keywords in section_keywords.items():
                for kw in keywords:
                    # Look for headers that are isolated or short line matching keywords
                    if len(line) < 30 and (
                        line.lower().strip() == kw.lower() or 
                        line.lower().strip().startswith(kw.lower() + ":") or 
                        line.lower().strip().endswith(kw.lower())
                    ):
                        current_section = sec_name
                        header_detected = True
                        break
                if header_detected:
                    break

            if header_detected:
                continue

            if current_section:
                detected[current_section].append(line)

        return {k: "\n".join(v) for k, v in detected.items() if v}

    def _extract_name(self, top_lines: List[str], full_text: str) -> Optional[str]:
        # 1. SpaCy Person Entity Recognition on the top lines
        if self.nlp:
            for line in top_lines[:5]:
                doc = self.nlp(line)
                for ent in doc.ents:
                    if ent.label_ == "PERSON" and 1 < len(ent.text.split()) <= 3:
                        return ent.text

        # 2. Regex fallback (e.g. "Name: John Doe")
        name_match = re.search(r"name\s*[:\-]?\s*([A-Z][a-z]+\s[A-Z][a-z]+)", full_text, re.IGNORECASE)
        if name_match:
            return name_match.group(1)

        # 3. Use the first non-empty line if it looks like a name
        if top_lines:
            first_line = top_lines[0].strip()
            if 3 < len(first_line) < 30 and all(x.isalpha() or x.isspace() for x in first_line):
                return first_line

        return None

    def _extract_skills(self, text: str) -> List[str]:
        # Load keywords from rules
        rules = get_field_rules()
        vocab = set()
        for field, keywords in rules.items():
            for kw in keywords:
                vocab.add(kw.lower())

        # Also add standard fallback skills
        standard_skills = [
            "python", "java", "c++", "c#", "javascript", "typescript", "html", "css",
            "sql", "mysql", "postgresql", "mongodb", "git", "docker", "aws", "gcp",
            "azure", "fastapi", "flask", "django", "react", "node", "express", "angular",
            "vue", "scikit-learn", "tensorflow", "pytorch", "keras", "pandas", "numpy",
            "tableau", "powerbi", "excel", "agile", "scrum", "jira", "figma", "adobe xd",
            "swift", "kotlin", "flutter", "android", "ios", "php", "laravel", "communication"
        ]
        for sk in standard_skills:
            vocab.add(sk.lower())

        found = set()
        normalized_text = text.lower()

        # Simple keyword matching using regex word boundaries to avoid partial matches
        for skill in vocab:
            pattern = rf"\b{re.escape(skill)}\b"
            if re.search(pattern, normalized_text):
                found.add(skill.title())

        return list(found)

    def _extract_degree(self, education_text: str) -> Optional[str]:
        if not education_text:
            return None
        degree_patterns = [
            r"\b(B\.?S\.?c?|M\.?S\.?c?|B\.?A\.?|M\.?A\.?|B\.?E\.?|M\.?E\.?|B\.?Tech|M\.?Tech|B\.?B\.?A\.?|M\.?B\.?A\.?|Ph\.?D\.?)\b",
            r"\b(Bachelor|Master|Doctor|PhD|Diploma|Matric|Intermediate)\b"
        ]
        for pattern in degree_patterns:
            match = re.search(pattern, education_text, re.IGNORECASE)
            if match:
                # Capture the surrounding context line or the match itself
                start = max(0, match.start() - 10)
                end = min(len(education_text), match.end() + 30)
                return education_text[start:end].replace('\n', ' ').strip()
        return None

    def _extract_college(self, education_text: str, full_text: str) -> Optional[str]:
        if education_text:
            lines = education_text.split('\n')
            for line in lines:
                if any(kw in line.lower() for kw in ["university", "college", "institute", "school", "academy"]):
                    return line.strip()
        # Fallback to search full text
        match = re.search(r"([A-Za-z0-9\s,]+(?:University|College|Institute|School|Academy)[A-Za-z0-9\s,]*)", full_text, re.IGNORECASE)
        return match.group(0).strip() if match else None

    def _extract_companies(self, experience_text: str) -> List[str]:
        if not experience_text:
            return []
        companies = []
        lines = experience_text.split('\n')
        for line in lines:
            # Check for common indicators of company names in experience entries
            if any(kw in line.lower() for kw in [" at ", " limited", " pvt", " corp", " inc", " co.", " company"]):
                match = re.search(r"([A-Za-z0-9\s]+(?:Pvt\.?\s*Ltd\.?|Ltd\.?|Corp\.?|Inc\.?|Co\.?|Company))", line, re.IGNORECASE)
                if match:
                    companies.append(match.group(0).strip())
                else:
                    companies.append(line.strip()[:50])
        # Use Spacy ORG tag if available
        if not companies and self.nlp:
            doc = self.nlp(experience_text)
            for ent in doc.ents:
                if ent.label_ == "ORG" and ent.text not in companies:
                    companies.append(ent.text)
        return list(set(companies))[:3]

    def _extract_designation(self, experience_text: str, full_text: str) -> Optional[str]:
        designations = ["software engineer", "developer", "analyst", "manager", "intern", "consultant", "lead", "architect", "designer", "specialist"]
        if experience_text:
            for line in experience_text.split('\n'):
                if any(des in line.lower() for des in designations):
                    return line.strip()[:60]
        # Fallback to full text
        for des in designations:
            match = re.search(rf"([^.\n]*\b{re.escape(des)}\b[^.\n]*)", full_text, re.IGNORECASE)
            if match:
                return match.group(0).strip()[:60]
        return None

    def _parse_total_experience(self, experience_text: str) -> float:
        if not experience_text:
            return 0.0
        # Search for year numbers or durations (e.g. "3 years", "2.5 yrs")
        matches = re.findall(r"(\d+(?:\.\d+)?)\s*(?:year|yr|month|mth)s?", experience_text, re.IGNORECASE)
        if matches:
            try:
                # Return the maximum mentioned duration in years
                val = max(float(x) for x in matches)
                if "month" in experience_text.lower():
                    # Check if it was months
                    if any(x in experience_text.lower() for x in ["month", "mth"]):
                        # Simplistic heuristic: if the max duration is > 20, assume it was months and convert
                        if val > 15:
                            return round(val / 12, 1)
                return round(val, 1)
            except Exception:
                pass
        return 0.0

    def _split_section_items(self, text: Optional[str]) -> List[str]:
        if not text:
            return []
        # Split by bullet points or newlines
        items = re.split(r"[\n\r•\-\*]+", text)
        cleaned = [item.strip() for item in items if len(item.strip()) > 10]
        return cleaned

    def _extract_url(self, text: str, domain: str) -> Optional[str]:
        match = re.search(rf"(?:https?://|www\.)[^\s]*{re.escape(domain)}[^\s]*", text, re.IGNORECASE)
        return match.group(0) if match else None

    def _extract_website(self, text: str) -> Optional[str]:
        urls = re.findall(r"(?:https?://|www\.)[^\s]+", text)
        for url in urls:
            lowered = url.lower()
            if "linkedin.com" in lowered or "github.com" in lowered:
                continue
            return url
        return None

    def _extract_location(self, lines: List[str]) -> Optional[str]:
        for line in lines[:12]:
            if any(token in line.lower() for token in ["@", "linkedin", "github", "http"]):
                continue
            match = re.search(r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*(?:[A-Z]{2,}|[A-Z][a-z]+)|Remote|Hybrid|Onsite)\b", line)
            if match:
                return match.group(1)
        return None
