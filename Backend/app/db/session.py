from __future__ import annotations

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import DB_PATH

os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)

DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False required for SQLite with FastAPI/Uvicorn threading model
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
