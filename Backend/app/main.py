"""HireGenii API — single FastAPI application.

Run from the backend/ directory:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
import time

from app.core import config  # noqa: I001  (must load .env before other app imports)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.router import api_router
from app.db.migrations import create_tables, run_startup_migrations
from app.modules.resumes.analysis_schemas import HealthResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title=config.API_TITLE,
    description="Resume analysis, ATS scoring, job matching and recruitment workflows.",
    version=config.API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Local SQLite schema (interim until the Supabase migrations in phase F3).
create_tables()


@app.on_event("startup")
def migrate_db() -> None:
    run_startup_migrations()


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        response = await call_next(request)
        response.headers["X-Process-Time"] = str(time.time() - start_time)
        return response


app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TimingMiddleware)


@app.get("/", tags=["health"])
def read_root() -> dict:
    return {"message": "HireGenii API", "status": "ok", "docs": "/docs"}


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health_check() -> HealthResponse:
    return HealthResponse(
        status="operational",
        version=config.API_VERSION,
        providers=["auto", "custom_rule", "gemini", "cerebras"],
    )


app.include_router(api_router)
