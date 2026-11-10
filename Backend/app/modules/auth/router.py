"""HTTP routes for the auth module (moved verbatim from the Hire-geni API)."""

from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import User
from app.db.session import get_db
from app.modules.auth.schemas import LoginRequest, RegisterRequest, RegisterResponse, UserPublic

router = APIRouter()
@router.post("/auth/register", response_model=RegisterResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    u = User(
        email=str(payload.email).lower().strip(),
        full_name=payload.full_name.strip(),
        role=payload.role.strip().lower(),
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    token = create_access_token(subject=u.email, extra_claims={"role": u.role, "uid": u.id})
    return RegisterResponse(
        user=u,  # type: ignore[arg-type]
        access_token=token
    )


@router.post("/auth/login", response_model=RegisterResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    email_clean = str(payload.email).lower().strip()
    u = db.execute(select(User).where(User.email == email_clean)).scalar_one_or_none()

    if not u or not u.is_active or not verify_password(payload.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token(subject=u.email, extra_claims={"role": u.role, "uid": u.id})
    return RegisterResponse(
        user=u,  # type: ignore[arg-type]
        access_token=token
    )


@router.get("/auth/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
