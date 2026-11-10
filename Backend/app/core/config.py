"""Central configuration for the HireGenii backend.

This module must be imported before anything that reads environment variables:
it loads the nearest `.env` (backend/.env first, then the repository root .env).
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]

load_dotenv(find_dotenv(usecwd=False), override=False)


def _path_setting(name: str, default: Path) -> str:
    """Resolve a filesystem setting; relative values are anchored to backend/, not the cwd."""
    value = os.getenv(name)
    path = Path(value) if value else default
    return str(path if path.is_absolute() else BACKEND_DIR / path)


DB_PATH = _path_setting("DB_PATH", Path("data") / "app.db")
UPLOAD_DIR = _path_setting("UPLOAD_DIR", Path("uploads"))
DATA_DIR = _path_setting("DATA_DIR", Path("data"))
MAX_UPLOAD_BYTES = int(float(os.getenv("MAX_UPLOAD_SIZE_MB", "5")) * 1024 * 1024)

_DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()] or _DEFAULT_CORS_ORIGINS

API_TITLE = "HireGenii API"
API_VERSION = "3.0.0"
