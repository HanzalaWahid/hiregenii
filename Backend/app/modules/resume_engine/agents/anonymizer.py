from __future__ import annotations
import logging
import re
from dataclasses import dataclass
from typing import Optional, List, Set, Dict, Any
import spacy

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class AnonymizedResult:
    anonymized_text: str
    removed_email: Optional[str] = None
    removed_phone: Optional[str] = None
    removed_name: Optional[str] = None
    removed_address: Optional[str] = None
    removed_institute: Optional[str] = None
    removed_nationality: Optional[str] = None
    removed_gender: Optional[str] = None
    removed_organization: Optional[str] = None
    institute_before: Optional[str] = None


class AnonymizationAgent:
    """
    Agent 2: Ultra-Precision Anonymization Agent (NLP & Heuristics)
    Strictly redacts PII while protecting Technical Merit and Keywords.
    """

    # In terms ko NLP chahe kuch bhi kahe, hum hide NAHI karenge
    TECH_WHITELIST = {
        "python", "javascript", "react", "fastapi", "nodejs", "docker", "aws", 
        "pytorch", "tensorflow", "sql", "mongodb", "postgresql", "git", "linux",
        "backend", "frontend", "fullstack", "full-stack", "xai", "agentic ai", 
        "cnn", "nlp", "deep learning", "machine learning", "opencv", "scikit-learn"
    }

    # Common verbs aur professional terms jo galti se hide ho jate hain
    PROTECTED_WORDS = {
        "developed", "engineered", "launched", "integrated", "managed", "led",
        "remote", "production", "scalable", "architecture", "deployment", "based"
    }

    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except Exception:
            self.nlp = None
        
        # Enhanced Regex Patterns
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b')
        
        # Common locations to mask specifically
        _cities = r'karachi|lahore|islamabad|rawalpindi|peshawar|faisalabad|multan|london|new york|dubai'
        _regions = r'pakistan|india|usa|uk|sindh|punjab|kpk|balochistan'
        self.geo_pattern = re.compile(r'\b(?:' + _cities + r'|' + _regions + r')\b', re.IGNORECASE)

    @staticmethod
    def _name_tokens(name: Optional[str]) -> List[str]:
        """Full name plus each part of 3+ letters, longest first so the full name wins overlaps."""
        if not name or not name.strip():
            return []
        full = " ".join(name.split())
        parts = [p for p in re.split(r"[\s.\-]+", full) if len(p) >= 3]
        return sorted({full, *parts}, key=len, reverse=True)

    def anonymize(
        self,
        text: str,
        *,
        remove_institute: bool,
        institute_hint: Optional[str] = None,
        name_hint: Optional[str] = None,
    ) -> AnonymizedResult:
        text = (text or "").strip()
        if not text: return AnonymizedResult("")

        # Fail closed: without the spaCy model we still run every regex/hint-based pass
        # instead of returning the original text unredacted.
        if not self.nlp:
            logger.warning("spaCy model unavailable; anonymization limited to regex and known-value redaction.")
        doc = self.nlp(text) if self.nlp else None
        pii_values = {"name": None, "email": None, "phone": None, "institute": institute_hint}
        replacements = []

        # 0. Known-value pass: the account holder's own name, and the institute when hiding it.
        for token in self._name_tokens(name_hint):
            for match in re.finditer(rf"\b{re.escape(token)}\b", text, re.IGNORECASE):
                replacements.append((match.start(), match.end(), "[HIDDEN NAME]"))
                if not pii_values["name"]: pii_values["name"] = name_hint.strip()
        if remove_institute and institute_hint and institute_hint.strip():
            for match in re.finditer(re.escape(institute_hint.strip()), text, re.IGNORECASE):
                replacements.append((match.start(), match.end(), "[HIDDEN INSTITUTION]"))

        # 1. Regex Pass (High Confidence)
        for match in self.email_pattern.finditer(text):
            replacements.append((match.start(), match.end(), "[HIDDEN EMAIL]"))
            if not pii_values["email"]: pii_values["email"] = match.group()
            
        for match in self.phone_pattern.finditer(text):
            replacements.append((match.start(), match.end(), "[HIDDEN PHONE]"))
            if not pii_values["phone"]: pii_values["phone"] = match.group()

        for match in self.geo_pattern.finditer(text):
            replacements.append((match.start(), match.end(), "[HIDDEN LOCATION]"))

        # 2. NLP Entity Pass
        # Reverse order to apply replacements without messing up indices
        entities = sorted(doc.ents, key=lambda e: e.start_char, reverse=True) if doc is not None else []
        
        for ent in entities:
            val_text = ent.text.strip()
            val_lower = val_text.lower()
            label = ent.label_
            
            # --- OVERRIDE LOGIC: Don't mask tech merit ---
            if val_lower in self.TECH_WHITELIST or val_lower in self.PROTECTED_WORDS:
                continue
            
            should_redact = False
            placeholder = f"[{label}]"
            
            if label == "PERSON":
                # Ensure it's not a mislabeled tech term
                if val_lower not in self.TECH_WHITELIST:
                    should_redact = True
                    placeholder = "[HIDDEN NAME]"
            
            elif label == "GPE" or label == "LOC":
                # Location protection
                if val_lower not in self.TECH_WHITELIST:
                    should_redact = True
                    placeholder = "[HIDDEN LOCATION]"
            
            elif label == "ORG" and remove_institute:
                # Mask University/Institute only in "Fair Mode"
                academic_triggers = ["university", "institute", "college", "school", "academy"]
                if any(t in val_lower for t in academic_triggers):
                    should_redact = True
                    placeholder = "[HIDDEN INSTITUTION]"
                    if not pii_values["institute"]: pii_values["institute"] = val_text

            if should_redact:
                replacements.append((ent.start_char, ent.end_char, placeholder))

        # 3. Apply replacements (Sorted by index reverse)
        replacements.sort(key=lambda x: x[0], reverse=True)
        
        redacted_text = text
        processed_intervals = []

        for start, end, placeholder in replacements:
            # Check for overlapping replacements
            if any(start < p_end and end > p_start for p_start, p_end in processed_intervals):
                continue
            
            redacted_text = redacted_text[:start] + placeholder + redacted_text[end:]
            processed_intervals.append((start, end))

        return AnonymizedResult(
            anonymized_text=redacted_text,
            removed_email=pii_values["email"],
            removed_phone=pii_values["phone"],
            removed_name=pii_values["name"],
            removed_institute=pii_values["institute"]
        )