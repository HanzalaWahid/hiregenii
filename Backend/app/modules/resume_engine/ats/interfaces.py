from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict


class ATSScorer(ABC):

    @abstractmethod
    def score(self, resume_data: Dict[str, Any], text: str) -> Dict[str, Any]:
        """Score a parsed resume and return a deterministic ATS result."""
        raise NotImplementedError
