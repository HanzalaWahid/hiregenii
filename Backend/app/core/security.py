from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core import config  # noqa: F401  (loads .env before settings below are read)

logger = logging.getLogger(__name__)

# Use PBKDF2-SHA256 for maximum compatibility on Windows/Python.
# (bcrypt backends can error depending on platform/build; PBKDF2 avoids bcrypt's 72-byte edge cases.)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

_KNOWN_INSECURE_SECRETS = {"dev-secret-change-me", "changeme", "change-me", "secret"}
_MIN_SECRET_LENGTH = 32
_ALLOWED_ALGORITHMS = {"HS256", "HS384", "HS512"}


def _resolve_jwt_secret() -> str:
    """Never sign tokens with a guessable secret.

    In production a strong JWT_SECRET is mandatory. In development, a missing or weak
    secret is replaced by a random per-process secret (tokens stop working on restart).
    """
    configured = os.getenv("JWT_SECRET", "")
    if configured and configured not in _KNOWN_INSECURE_SECRETS and len(configured) >= _MIN_SECRET_LENGTH:
        return configured
    if os.getenv("APP_ENV", "development").strip().lower() == "production":
        raise RuntimeError(f"JWT_SECRET must be set to a random value of at least {_MIN_SECRET_LENGTH} characters.")
    logger.warning(
        "JWT_SECRET is missing or weak; using a random per-process secret. "
        "Sessions will be invalidated on every restart. Set JWT_SECRET in your .env (see .env.example)."
    )
    return secrets.token_urlsafe(64)


def _resolve_jwt_algorithm() -> str:
    algorithm = os.getenv("JWT_ALGORITHM", "HS256").strip().upper()
    if algorithm not in _ALLOWED_ALGORITHMS:
        raise RuntimeError(f"JWT_ALGORITHM must be one of {sorted(_ALLOWED_ALGORITHMS)}.")
    return algorithm


JWT_SECRET = _resolve_jwt_secret()
JWT_ALGORITHM = _resolve_jwt_algorithm()
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "720"))  # 12 hours default


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(*, subject: str, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=JWT_EXPIRES_MINUTES)
    payload: Dict[str, Any] = {"sub": subject, "iat": int(now.timestamp()), "exp": exp}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as e:
        raise ValueError("Invalid token") from e

