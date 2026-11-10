from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict


class RecommendationEngine(ABC):

    @abstractmethod
    def recommend(self, extracted_data: Dict[str, Any], text: str) -> Dict[str, Any]:
        """Generate deterministic recommendations based on extracted resume data."""
        raise NotImplementedError
