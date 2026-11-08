from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict

from .interfaces import ResumeExtractor
from .llm_prompt import build_resume_extraction_prompt
from .text_extraction import extract_text
from ..config import get_env

logger = logging.getLogger(__name__)


class GeminiExtractor(ResumeExtractor):
    """
    Resume extractor that leverages the Google Gemini API to parse unstructured text 
    into a structured JSON schema.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or get_env("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured. Please set it in your environment or configuration.")
        
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("gemini-pro")
        except ImportError:
            raise RuntimeError("google-generativeai library is not installed. Install it with: pip install google-generativeai")
        except Exception as e:
            raise ValueError(f"Failed to initialize Gemini API: {e}")

    def extract(self, resume_path: Path) -> Dict[str, Any]:
        raw_text = extract_text(resume_path)
        if not raw_text:
            return {"parsed_data": {}, "raw_text": ""}

        prompt = build_resume_extraction_prompt(raw_text)

        try:
            logger.info("Calling Gemini API for resume extraction...")
            response = self.model.generate_content(prompt)
            content_text = response.text
            
            # Extract JSON from the response
            parsed_json = json.loads(content_text)
            
            return {
                "parsed_data": parsed_json,
                "raw_text": raw_text
            }
        except Exception as e:
            logger.error("Gemini API call failed: %s", e)
            raise RuntimeError(f"Gemini extraction failed: {e}")
