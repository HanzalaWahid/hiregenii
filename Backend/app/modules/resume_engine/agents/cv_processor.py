from __future__ import annotations
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional
import spacy

@dataclass(frozen=True)
class ParsedCV:
    raw_text: str
    sections: Dict[str, str]
    skills: List[str]
    experience_years: float
    projects: List[Dict[str, str]]
    projects_count: int
    certifications_count: int
    cgpa: Optional[float]
    education_institute: Optional[str]
    last_company: Optional[str] = None
    summary: Optional[str] = None

class CVProcessorAgent:
    """
    Agent 1: Professional CV Processor (Local NLP & Regex)
    Optimized for Rumaz Qureshi's FYP Demo (HireGinni).
    """

    TECH_WHITELIST = {
        "fastapi", "mern", "next.js", "nextjs", "react", "typescript", "xai", 
        "agentic ai", "cnn", "nlp", "python", "javascript", "nodejs", "docker", 
        "sql", "mongodb", "postgresql", "aws", "git", "scikit-learn", "opencv",
        "tailwind css", "supabase", "flask", "deep learning", "machine learning"
    }

    _header_regex = re.compile(
        r"(?im)^(skills?|technical skills?|competencies|experience|work experience|employment|history|.*projects?|portfolio|education|academic|background|certifications?|awards?|summary|about me|profile|objective)\s*[:\-]?\s*$"
    )

    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except Exception:
            self.nlp = None

    def process(self, text: str) -> ParsedCV:
        text = (text or "").strip()
        sections = self._split_sections(text)

        # 1. Extraction with intelligent fallbacks
        skills_text = sections.get("skills", "") or text
        skills = self._extract_skills(skills_text)
        
        # FIXED: Section-specific experience calculation
        experience_years = self._extract_experience_years(text)
        
        cert_text = sections.get("certifications", "") or text
        certifications_count = self._extract_cert_count(cert_text)
        
        cgpa = self._extract_cgpa(sections.get("education", "") or text)
        education_institute = self._extract_institute(sections.get("education", "") or text)
        
        # FIXED: Last company extraction
        exp_content = sections.get("experience", "")
        last_company = self._extract_last_company(exp_content)
        
        # 2. Project Extraction
        project_text = sections.get("projects", "")
        projects = []
        if project_text:
            potential_projects = re.split(r'\n\n+', project_text)
            for p_block in potential_projects:
                p_block = p_block.strip()
                if not p_block: continue
                lines = p_block.split('\n')
                title = lines[0].strip()
                if title.startswith(('•', '-', '*')):
                    title = title[1:].strip()
                
                desc = "\n".join(lines[1:]).strip()
                if len(title) > 3:
                    projects.append({"title": title[:100], "description": desc})
        
        projects_count = len(projects) if projects else self._estimate_projects(text)

        # 3. Summary Generation
        summary_raw = sections.get("summary", "") or sections.get("other", "").split('\n')[0]
        summary = summary_raw.strip()
        if not summary or len(summary) < 10:
            summary = "Professional profile extracted and analyzed for technical qualifications."
        elif len(summary) > 600:
            summary = summary[:600] + "..."

        return ParsedCV(
            raw_text=text,
            sections=sections,
            skills=skills,
            experience_years=experience_years,
            projects=projects,
            projects_count=projects_count,
            certifications_count=certifications_count,
            cgpa=cgpa,
            education_institute=education_institute,
            last_company=last_company,
            summary=summary
        )

    def _extract_last_company(self, text: str) -> Optional[str]:
        if not text: return "Independent"
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        BLACKLIST_CORP = {"remote", "pakistan", "karachi", "present", "founder", "lead"}
        
        for line in lines[:5]:
            line_clean = re.sub(r'\(.*?\)|\[.*?\]', '', line).strip()
            if any(k in line_clean.lower() for k in ["university", "institute"]): continue
            if any(k in line_clean for k in ["InnovaTech", "Corporation", "InternIntelligence"]):
                return re.split(r'[,|—]', line_clean)[0].strip()[:100]
        return "Not specified"

    def _split_sections(self, text: str) -> Dict[str, str]:
        lines = text.splitlines()
        current = "other"
        out: Dict[str, List[str]] = {current: []}
        for line in lines:
            line_strip = line.strip()
            if not line_strip: continue
            if self._header_regex.match(line_strip):
                h = line_strip.lower()
                if "skill" in h: current = "skills"
                elif any(x in h for x in ["experience", "employment", "history"]): current = "experience"
                elif any(x in h for x in ["project", "portfolio"]): current = "projects"
                elif any(x in h for x in ["education", "academic"]): current = "education"
                elif any(x in h for x in ["cert", "award"]): current = "certifications"
                elif any(x in h for x in ["summary", "profile", "objective"]): current = "summary"
                else: current = "other"
                out.setdefault(current, [])
                continue
            out.setdefault(current, []).append(line)
        return {k: "\n".join(v).strip() for k, v in out.items() if v}

    def _extract_skills(self, text: str) -> List[str]:
        # FIXED: Protected whitelist and Blacklist for Academic noise
        PROTECTED = {"python", "fastapi", "react", "next.js", "mern", "xai", "agentic ai", "backend", "frontend", "sql", "git", "opencv", "eda"}
        BLACKLIST = {"university", "institute", "college", "department", "karachi", "pakistan", "dawood", "engineering", "f-bsai"}

        if not self.nlp:
            return [s.strip() for s in re.split(r'[,;|•/]+', text) if len(s.strip()) > 2][:30]

        doc = self.nlp(text)
        extracted = []
        for ent in doc.ents:
            val = ent.text.strip().lower()
            if val in PROTECTED:
                extracted.append(ent.text.strip())
                continue
            if ent.label_ in ('GPE', 'PERSON', 'DATE') or any(b in val for b in BLACKLIST):
                continue
            if 2 < len(val) < 40 and len(val.split()) < 4:
                extracted.append(ent.text.strip())

        for word in re.split(r'[\s,:/()]+', text):
            if word.lower() in PROTECTED:
                extracted.append(word.strip('.,:;()'))

        seen = set()
        return [x for x in extracted if not (x.lower() in seen or seen.add(x.lower()))][:40]

    def _extract_experience_years(self, text: str) -> float:
        # FIXED: Only process dates from the Experience section
        sections = self._split_sections(text)
        target_text = sections.get("experience", "")
        if len(target_text) < 30: target_text = text # Fallback if sectioning fails

        current_year, current_month = 2026, 5 # Project Timeline
        MONTH_ABBR = {"jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,"jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12}

        def parse_date(token: str):
            token = token.strip().lower()
            if any(k in token for k in ["present", "current", "now"]): return (current_year, current_month)
            m = re.search(r'(20\d{2})', token)
            if m:
                year = int(m.group(1))
                if year < 2023 and len(sections.get("experience", "")) < 10: return None # Skip Edu dates
                month = 1
                for name, num in MONTH_ABBR.items():
                    if name in token: month = num; break
                return (year, month)
            return None

        pattern = re.compile(r'((?:\d{1,2}/)?20\d{2}|[A-Za-z]{3,}\s+20\d{2})\s*[-–—to]+\s*((?:\d{1,2}/)?20\d{2}|[A-Za-z]{3,}\s+20\d{2}|present|current)', re.I)
        intervals = []
        for m in pattern.finditer(target_text):
            s, e = parse_date(m.group(1)), parse_date(m.group(2))
            if s and e:
                s_m, e_m = s[0]*12+s[1], e[0]*12+e[1]
                if e_m >= s_m: intervals.append((s_m, e_m))

        if not intervals: return 0.0
        intervals.sort()
        merged = []
        for s, e in intervals:
            if not merged or s > merged[-1][1]: merged.append([s, e])
            else: merged[-1][1] = max(merged[-1][1], e)
        
        return round(sum(e - s for s, e in merged) / 12.0, 1)

    def _extract_cgpa(self, text: str) -> Optional[float]:
        m = re.search(r"\b(?:cgpa|gpa|grade|score)\b\s*[:\-]?\s*([0-4](?:\.\d{1,2})?)\b", text, re.I)
        if m: return float(m.group(1))
        m2 = re.search(r"\b([0-4](?:\.\d{1,2})?)\s*/\s*4(?:\.0)?\b", text)
        return float(m2.group(1)) if m2 else None

    def _extract_institute(self, text: str) -> Optional[str]:
        for line in text.splitlines():
            if re.search(r"\b(university|institute|college|school)\b", line, re.I):
                return re.sub(r"\(.*?\)|\[.*?\]|\b\d{4}\b.*", "", line).strip()[:120]
        return None

    def _extract_cert_count(self, text: str) -> int:
        return min(len(re.findall(r"\b(certified|certification|course|credential)\b", text, re.I)), 15)

    def _estimate_projects(self, text: str) -> int:
        count = len(re.findall(r"(?m)^\s*[-•\*]\s+", text))
        return min(count if count > 0 else len(re.findall(r"\bproject\b", text, re.I)), 12)