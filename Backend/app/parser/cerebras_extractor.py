from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict

import requests

from .interfaces import ResumeExtractor
from .llm_prompt import build_resume_extraction_prompt
from .text_extraction import extract_text
from ..config import get_env

logger = logging.getLogger(__name__)


class CerebrasExtractor(ResumeExtractor):
    """Extract structured resume data through Cerebras chat completions."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = api_key or get_env("CEREBRAS_API_KEY")
        if not self.api_key:
            raise ValueError("CEREBRAS_API_KEY is not configured.")
        self.model = model or get_env("CEREBRAS_MODEL", "qwen-3.8-27b")

    def extract(self, resume_path: Path) -> Dict[str, Any]:
        raw_text = extract_text(resume_path)
        if not raw_text:
            return {"parsed_data": {}, "raw_text": ""}

        try:
            response = requests.post(
                "https://api.cerebras.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "user",
                            "content": build_resume_extraction_prompt(raw_text),
                        }
                    ],
                    "temperature": 0,
                },
                timeout=60,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            status_code = exc.response.status_code if exc.response is not None else None
            if status_code is not None:
                raise RuntimeError(f"Cerebras API request failed with HTTP {status_code}.") from exc
            raise RuntimeError("Cerebras API request failed; check the network and API configuration.") from exc

        try:
            content = response.json()["choices"][0]["message"]["content"]
            parsed_data = json.loads(content)
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            logger.error("Cerebras returned an invalid resume extraction response.")
            raise RuntimeError("Cerebras returned an invalid JSON extraction response.") from exc

        if not isinstance(parsed_data, dict):
            raise RuntimeError("Cerebras returned resume data in an unexpected format.")

        return {"parsed_data": parsed_data, "raw_text": raw_text}
