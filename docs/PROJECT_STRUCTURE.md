# Project structure

The repository now contains one React/Vite frontend and one modular FastAPI
backend. The resume-analysis and recruiter workflows share the application
entry points, but retain distinct routes and data flows.

```text
.
├── .env.example
├── README.md
├── backend/
│   ├── requirements.txt
│   ├── data/                       Local SQLite data and analysis artifacts
│   ├── uploads/                    Local candidate resume uploads
│   └── app/
│       ├── main.py                 FastAPI app, middleware, health endpoints
│       ├── api/router.py           Aggregates feature routers
│       ├── core/                   Configuration, JWT security, dependencies
│       ├── db/                     SQLAlchemy models, SQLite session, migrations
│       ├── integrations/           Planned integration boundary
│       ├── modules/
│       │   ├── auth/ candidates/ jobs/ applications/ recruiters/
│       │   ├── interviews/ notifications/ resumes/
│       │   ├── resume_engine/      Parsing, scoring, recommendations, agents
│       │   ├── admin/ organizations/  Planned placeholders
│       └── services/               Access, agents, cache, realtime, extraction
├── docs/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── app/                    App shell and public pages
│       ├── components/             Shared UI and UI primitives
│       ├── layouts/
│       ├── modules/
│       │   ├── auth/
│       │   ├── job-seeker/         Profiles, CV, jobs, resume analysis
│       │   ├── recruiter/
│       │   └── shared/
│       ├── services/               Shared API client
│       ├── hooks/ types/ utils/
└── supabase/                       Migration/function placeholders only
```

## Entry points and responsibilities

- `frontend/src/main.tsx` mounts the React application; `frontend/src/app/App.tsx`
  defines public, seeker, and recruiter routes.
- `frontend/src/services/api.ts` is the shared HTTP client. Resume-analysis
  requests are grouped in `frontend/src/modules/job-seeker/resume-analysis/api.ts`.
- `frontend/vite.config.ts` runs the frontend on port `8080`. The API base URL
  is configured by `VITE_API_BASE_URL`; the frontend config does not define a
  development proxy.
- `backend/app/main.py` creates the FastAPI app, database tables, middleware,
  and health routes. Run it from `backend/` as `uvicorn app.main:app`.
- `backend/app/api/router.py` includes feature routers from
  `backend/app/modules/*/router.py`.
- `backend/app/modules/resumes/analysis_router.py` serves the standalone
  analyzer API paths. Its pipeline is in
  `backend/app/modules/resume_engine/`.
- `backend/app/modules/resumes/router.py` and the other domain routers serve
  authenticated CV, candidate, job, application, recruiter, interview, and
  notification workflows.
- `backend/app/db/` uses local SQLite through SQLAlchemy. Supabase is not
  integrated; the `supabase/` folders are placeholders.

Local databases and uploaded resumes may contain sensitive data. They are
development artifacts, not disposable application source.
