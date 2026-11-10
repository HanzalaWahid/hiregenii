"""Local SQLite schema setup.

Interim only: the platform plan replaces this with Supabase migrations (phase F3).
`create_tables()` runs at import of the app (as before); `run_startup_migrations()`
runs on application startup.
"""

from __future__ import annotations

import logging

from sqlalchemy import text

from app.db.models import APPLICATION_UNIQUE_INDEX, Base
from app.db.session import engine

logger = logging.getLogger(__name__)


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def run_startup_migrations() -> None:
    with engine.connect() as conn:
        # UserProfile columns added after the first release (no-op when present).
        for ddl in (
            "ALTER TABLE user_profiles ADD COLUMN phone VARCHAR(50)",
            "ALTER TABLE user_profiles ADD COLUMN address VARCHAR(255)",
            "ALTER TABLE user_profiles ADD COLUMN current_university VARCHAR(200)",
        ):
            try:
                conn.execute(text(ddl))
            except Exception:
                pass
        conn.commit()

        # One application per (job, candidate). Never delete data automatically: if an
        # older database already holds duplicates, log them and leave the index for a manual cleanup.
        duplicates = conn.execute(text(
            "SELECT job_id, user_id, COUNT(*) FROM applications "
            "GROUP BY job_id, user_id HAVING COUNT(*) > 1"
        )).fetchall()
        if duplicates:
            logger.error(
                "Not adding unique index %s: %d duplicate (job_id, user_id) pairs exist: %s",
                APPLICATION_UNIQUE_INDEX, len(duplicates), [tuple(row) for row in duplicates[:20]],
            )
        else:
            conn.execute(text(
                f"CREATE UNIQUE INDEX IF NOT EXISTS {APPLICATION_UNIQUE_INDEX} ON applications (job_id, user_id)"
            ))
            conn.commit()
