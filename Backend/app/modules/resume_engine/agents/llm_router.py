import os
import json
import logging
from typing import Optional, Dict, Any
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

class LLMRouter:
    """
    Centralized LLM Router for the Agentic Architecture.
    Implements the "LLM Fallback" pattern:
    1. Attempts to use Groq (Llama-3.3-70B) for maximum speed and cost-efficiency.
    2. If Groq fails (e.g. rate limit, 503), instantly falls back to Google Gemini (Gemini-1.5-Flash).
    3. Returns the strictly parsed JSON object, or None if all models fail (triggering local fallback).
    """
    
    @staticmethod
    def generate_json(prompt: str, system_prompt: Optional[str] = None, model_override: Optional[str] = None) -> Optional[Dict[str, Any]]:
        load_dotenv()
        
        # 1. Primary Route: Groq API
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                
                groq_model = model_override or "llama-3.3-70b-versatile"
                
                response = client.chat.completions.create(
                    model=groq_model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.0
                )
                res_str = response.choices[0].message.content
                if res_str:
                    logger.debug(f"Data Orchestrator: Success via primary channel ({groq_model})")
                    return json.loads(res_str)
            except Exception as e:
                logger.debug(f"Data Orchestrator: Primary channel fallback triggered. Detail: {e}")

        # 2. Fallback Route: Google Gemini API
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=gemini_key)
                
                # Combine system prompt if provided
                gemini_prompt = prompt
                if system_prompt:
                    gemini_prompt = f"System: {system_prompt}\n\nUser: {prompt}"
                
                gemini_prompt += "\n\nIMPORTANT: Return ONLY a valid JSON object. Do not wrap it in markdown block quotes (```json)."
                
                response = client.models.generate_content(
                    model='gemini-1.5-flash',
                    contents=gemini_prompt,
                    config={'temperature': 0.0}
                )
                
                res_str = response.text.strip()
                # Clean up markdown if the model hallucinated code block wrappers
                if res_str.startswith("```json"):
                    res_str = res_str.replace("```json", "", 1).strip()
                    if res_str.endswith("```"):
                        res_str = res_str[:-3].strip()
                elif res_str.startswith("```"):
                    res_str = res_str.replace("```", "", 1).strip()
                    if res_str.endswith("```"):
                        res_str = res_str[:-3].strip()
                    
                logger.debug("Data Orchestrator: Success via secondary channel")
                return json.loads(res_str)
            except Exception as e:
                logger.debug(f"Data Orchestrator: Secondary channel failed. Detail: {e}")

        logger.debug("Data Orchestrator: All remote channels failed. Switching to local rules engine.")
        return None
