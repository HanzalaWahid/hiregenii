from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

APPLICATION_UNIQUE_INDEX = "uq_application_job_user"


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # seeker | recruiter
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    cvs: Mapped[list["CVRecord"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    profile: Mapped[Optional["UserProfile"]] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)
    recruiter_profile: Mapped[Optional["RecruiterProfile"]] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)
    jobs: Mapped[list["Job"]] = relationship(back_populates="recruiter", cascade="all, delete-orphan")
    applications: Mapped[list["Application"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class RecruiterProfile(Base):
    __tablename__ = "recruiter_profiles"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True, nullable=False)
    
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    company_website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    company_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    user: Mapped["User"] = relationship(back_populates="recruiter_profile")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recruiter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    experience_level: Mapped[str] = mapped_column(String(50), default="entry", nullable=False)
    required_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    recruiter: Mapped["User"] = relationship(back_populates="jobs")
    applications: Mapped[list["Application"]] = relationship(back_populates="job", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"
    # One application per candidate per job. Named so the startup migration can add the
    # same index to databases created before this constraint existed.
    __table_args__ = (Index(APPLICATION_UNIQUE_INDEX, "job_id", "user_id", unique=True),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    cv_record_id: Mapped[int] = mapped_column(ForeignKey("cv_records.id"), nullable=False)
    
    score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="applied")  # applied | shortlisted | rejected
    reveal_status: Mapped[str] = mapped_column(String(20), default="none") # none | pending | approved | rejected

    # Per-application, job-specific XAI explanation for the seeker.
    # Stored HERE (not on CVRecord) so multiple applications with the same CV
    # each get their own independent explanation that can never be overwritten.
    xai_explanation: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    job: Mapped["Job"] = relationship(back_populates="applications")
    user: Mapped["User"] = relationship(back_populates="applications")
    cv_record: Mapped["CVRecord"] = relationship()


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False) # seeker
    
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    meeting_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="scheduled") # scheduled | completed | cancelled
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    job: Mapped["Job"] = relationship()
    user: Mapped["User"] = relationship()


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), default="info") # info | success | warning | reveal_request
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    extra_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=True) # For application IDs etc.
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="notifications")


class CVRecord(Base):
    __tablename__ = "cv_records"
    __table_args__ = (UniqueConstraint("user_id", "candidate_id", name="uq_cv_user_candidate"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    # from pipeline output
    candidate_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    toggle_view: Mapped[str] = mapped_column(String(20), nullable=False)  # normal | anonymized

    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    anonymized_text: Mapped[str] = mapped_column(Text, nullable=False)

    removed: Mapped[dict] = mapped_column(JSON, nullable=False)  # {name,email,phone,institute}
    extracted: Mapped[dict] = mapped_column(JSON, nullable=False)  # skills, counts, etc
    scoring: Mapped[dict] = mapped_column(JSON, nullable=False)  # score, matched, missing, breakdown
    explanations: Mapped[dict] = mapped_column(JSON, nullable=False)  # seeker/recruiter explainability
    recommendations: Mapped[list] = mapped_column(JSON, nullable=False)  # list of recs

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True, nullable=False)

    user: Mapped["User"] = relationship(back_populates="cvs")


class UserProfile(Base):
    __tablename__ = "user_profiles"
    __table_args__ = (UniqueConstraint("user_id", name="uq_profile_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    experience: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    education: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    current_university: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="profile")


