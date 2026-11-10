from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Set

from ..config import get_field_rules

logger = logging.getLogger(__name__)


class KnowledgeRepository:
    """
    Knowledge Layer interface that handles:
    - Skill Lookup (checking if a skill exists in the database/vocab)
    - Alias Resolution (mapping synonyms to standard canonical skills)
    - Unknown Skills Tracking (logging unrecognized skills to a file for review)
    """

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        self.data_dir = data_dir or Path(__file__).resolve().parent
        self.data_dir.mkdir(exist_ok=True)
        self.unknown_skills_file = self.data_dir / "unknown_skills.json"
        
        # Load canonical skills from configuration
        self.canonical_skills: Set[str] = set()
        try:
            rules = get_field_rules()
            for field_name, keywords in rules.items():
                for kw in keywords:
                    self.canonical_skills.add(kw.strip().lower())
        except Exception as e:
            logger.error("Failed to load canonical skills from rules: %s", e)

        # Standard dictionary of aliases mapped to canonical titles
        self.alias_map: Dict[str, str] = {
            "reactjs": "React",
            "react.js": "React",
            "react js": "React",
            "nodejs": "Node.js",
            "node.js": "Node.js",
            "node js": "Node.js",
            "js": "JavaScript",
            "javascript": "JavaScript",
            "ts": "TypeScript",
            "typescript": "TypeScript",
            "ml": "Machine Learning",
            "machinelearning": "Machine Learning",
            "machine learning": "Machine Learning",
            "dl": "Deep Learning",
            "deeplearning": "Deep Learning",
            "deep learning": "Deep Learning",
            "tf": "TensorFlow",
            "tensorflow": "TensorFlow",
            "pytorch": "PyTorch",
            "sklearn": "Scikit-Learn",
            "scikit learn": "Scikit-Learn",
            "scikit-learn": "Scikit-Learn",
            "aws": "AWS",
            "amazon web services": "AWS",
            "gcp": "GCP",
            "google cloud": "GCP",
            "google cloud platform": "GCP",
            "azure": "Microsoft Azure",
            "rest api": "RESTful API",
            "restful api": "RESTful API",
            "rest api's": "RESTful API",
            "html5": "HTML",
            "html": "HTML",
            "css3": "CSS",
            "css": "CSS",
            "mongodb": "MongoDB",
            "postgres": "PostgreSQL",
            "postgresql": "PostgreSQL",
            "mysql": "MySQL",
            "python3": "Python",
            "python": "Python",
        }

    def resolve_skill(self, skill: str) -> str:
        """Resolve a parsed skill to its canonical name or return it formatted."""
        clean_skill = skill.strip().lower()
        
        # Check direct alias
        if clean_skill in self.alias_map:
            return self.alias_map[clean_skill]
            
        # Check standard dictionary
        for alias, canonical in self.alias_map.items():
            if clean_skill == alias:
                return canonical
                
        # Fallback to title case
        return skill.strip().title()

    def is_known_skill(self, skill: str) -> bool:
        """Check if the skill is defined in our canonical dictionary or configured fields."""
        clean_skill = skill.strip().lower()
        if clean_skill in self.canonical_skills:
            return True
        if clean_skill in self.alias_map:
            return True
        return False

    def log_unknown_skill(self, skill: str) -> None:
        """Log an unrecognized skill to unknown_skills.json for future admin review."""
        if not skill or self.is_known_skill(skill):
            return

        skill_normalized = skill.strip().title()
        
        # Read existing log
        logged_skills: Dict[str, int] = {}
        if self.unknown_skills_file.exists():
            try:
                with self.unknown_skills_file.open("r", encoding="utf-8") as fh:
                    logged_skills = json.load(fh)
            except Exception as e:
                logger.error("Failed to read unknown skills file: %s", e)

        # Increment occurrence count
        logged_skills[skill_normalized] = logged_skills.get(skill_normalized, 0) + 1

        # Write back to file
        try:
            with self.unknown_skills_file.open("w", encoding="utf-8") as fh:
                json.dump(logged_skills, fh, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error("Failed to write to unknown skills file: %s", e)
