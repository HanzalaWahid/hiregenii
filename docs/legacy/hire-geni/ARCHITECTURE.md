# Architecture Overview

## 1. High-Level Layers
The application follows a simple three-layer structure:

1. Frontend Layer
   - React/Vite interface for recruiters and seekers
   - Handles job posting, CV upload, dashboards, notifications, and interview views

2. Backend Layer
   - FastAPI application
   - Routes for auth, profile, job, CV, ranking, reveal workflow, and interview events
   - Uses SQLAlchemy ORM for persistence

3. Data & AI Layer
   - SQLite database
   - CV anonymization and extraction logic
   - Feature scoring and candidate ranking
   - Explainable AI and recommendation generation

## 2. Main Backend Components

### `backend/main.py`
- Initializes FastAPI app
- Registers middleware for compression and timing
- Handles WebSocket connection lifecycle
- Contains most route handlers and orchestration logic

### `backend/models.py`
- Defines the database schema for users, jobs, applications, CV records, profiles, notifications, and interviews

### `backend/schemas.py`
- Pydantic validation models used for request and response payloads

### `backend/agents/`
- AI and logic workers for:
  - anonymization
  - CV processing
  - ranking
  - scoring
  - explainability
  - recommendations

## 3. Core Workflow
```text
User registers/logs in
    -> profile setup
    -> upload CV or create job
    -> CV is extracted and anonymized
    -> ranking/scoring is computed
    -> recruiter shortlists candidates
    -> reveal request and approval workflow
    -> interview scheduling
```

## 4. Security and Privacy Design
- Recruiters do not see raw candidate PII at initial screening
- Candidate approval is required before identity reveal
- JWT tokens are used for access control
- A privacy-first screening flow reduces early exposure to demographic features

## 5. Limitations
- This is an advanced prototype, not a full enterprise platform
- Local SQLite database is not designed for high concurrency or large-scale production deployment
- Some LLM and AI modules may require tuning for stable, explainable output

## 6. Suggested Next Improvements
- Add migrations and database versioning
- Add API rate limiting and caching
- Improve explainable AI consistency
- Add audit logs and role-level authorization hardening
- Add automated testing for routes and scoring flow
