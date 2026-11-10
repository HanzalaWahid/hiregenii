# API and service flow

The repository runs one FastAPI application. `backend/app/main.py` creates the
app and includes `backend/app/api/router.py`, which assembles the domain routers.
The resume-analysis routes and candidate/recruiter routes share that process,
but keep separate request flows and persistence behavior.

## Application entry points

- Frontend: `frontend/src/main.tsx` mounts the app; `frontend/src/app/App.tsx`
  defines public, seeker, and recruiter routes.
- Backend: from `backend/`, run `uvicorn app.main:app --reload --port 8000`.
- Interactive API documentation is available at `/docs` while the API is
  running.
- The frontend API base URL is `VITE_API_BASE_URL`, defaulting to
  `http://127.0.0.1:8000`.

## Resume-analysis flow

The analyzer pages are integrated into the seeker area under
`frontend/src/modules/job-seeker/resume-analysis/`.

1. The frontend posts a PDF or DOCX to `POST /api/analyze`, with an optional
   provider (`auto`, `custom_rule`, `gemini`, or `cerebras`).
2. `backend/app/modules/resumes/analysis_router.py` validates the extension,
   saves the upload to a temporary directory, and invokes
   `backend/app/modules/resume_engine/services/analysis_service.py`.
3. The engine extracts and normalizes resume data, calculates a heuristic ATS
   score, and creates recommendations.
4. The endpoint returns an `AnalysisResponse` and removes the temporary upload.
   The analysis result is not persisted to the application database.

The resume-analysis API routes currently have no authentication dependency.
The seeker UI is nested under the frontend's protected route, but that frontend
guard does not secure direct calls to these API routes.

`POST /api/job-match` compares resume-skill strings with job-description
keywords; it is not semantic or embedding-based matching. Skill aliases are
held in memory and reset when the backend process restarts. Unknown-skill counts
are written under `backend/app/modules/resume_engine/knowledge/`.

Provider behavior is implemented in the resume engine. External providers are
used only when selected; resume text may be sent to the configured provider.
See [API_REFERENCE.md](API_REFERENCE.md) for routes and
[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) for flow boundaries.

## Candidate and recruiter flow

1. A seeker or recruiter registers or logs in through `/auth/*`; the frontend
   stores the custom JWT and sends it as a bearer token.
2. Protected API routes resolve the user through `backend/app/core/deps.py`,
   then use the SQLite/SQLAlchemy models in `backend/app/db/`.
3. Candidate CV upload (`POST /cv/upload`) validates and extracts the file,
   creates anonymized and parsed data, scores it, and stores the CV record.
   An optional `job_id` can create an application.
4. Recruiter routes operate on owned jobs and applications. Shortlist and
   reject actions require recruiter actions; shortlist suggestions are
   read-only.
5. Candidate-controlled identity reveal, interview scheduling, and
   notifications use application state and persisted SQLite records.
   `/ws/jobs` sends process-local live events to connected users.

Resume files and candidate records are stored locally during development.
They contain sensitive information; the current storage is not Supabase
Storage. See [ERD.md](ERD.md), [API_REFERENCE.md](API_REFERENCE.md), and
[SECURITY_REVIEW.md](SECURITY_REVIEW.md) for details.
