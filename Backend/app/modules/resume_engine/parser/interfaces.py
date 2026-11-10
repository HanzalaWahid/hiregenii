from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict


class ResumeExtractor(ABC):

    @abstractmethod
    def extract(self, resume_path: Path) -> Dict[str, Any]:
        """Extract structured resume data from a file path."""
        raise NotImplementedError
