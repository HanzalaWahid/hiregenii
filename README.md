# HireGenii

An AI-assisted career and recruitment platform:
- **Job seekers** analyze and improve their resume and apply to jobs.
- **Recruiters** post jobs, review anonymized candidates and schedule interviews.

It unifies the former **AI Resume Analyzer** and **Hire-geni** apps into one frontend and one backend.

> Status: development. The backend still uses a local SQLite database and its own JWT auth. Moving to Supabase (Auth, Postgres + RLS, Storage, Realtime) is planned; see [docs/hiregenii/CANDIDATE_PLATFORM_PLAN.md](docs/hiregenii/CANDIDATE_PLATFORM_PLAN.md).

## Repository structure

```text
├── frontend/                 React 18 + TypeScript + Vite + shadcn/ui
│   └── src/
│       ├── app/              App shell, routes, landing and 404 pages
│       ├── components/       Shared UI (shadcn/ui in components/ui)
│       ├── layouts/          Dashboard layout, header, sidebar
│       ├── modules/
│       │   ├── auth/         Auth context, protected route, login/register
│       │   ├── job-seeker/   Seeker pages + resume-analysis/ (ATS report, explorer, job matcher, skills)
│       │   ├── recruiter/    Recruiter pages
│       │   ├── shared/       Pages used by both roles (interviews)
│       │   └── admin/        Planned
│       ├── services/         API client
│       ├── hooks/  types/  utils/
├── backend/                  One FastAPI application
│   ├── app/
│   │   ├── main.py           App, middleware, health routes
│   │   ├── api/router.py     Includes every module router
│   │   ├── core/             Config (.env loading), security (JWT/passwords), auth dependency
│   │   ├── db/               SQLAlchemy session, models, startup migrations (interim SQLite)
│   │   ├── services/         Shared agent instances, realtime (WebSocket), access helpers, text extraction
│   │   ├── integrations/     Planned (Supabase client)
│   │   └── modules/
│   │       ├── auth/ candidates/ jobs/ applications/ recruiters/ interviews/ notifications/
│   │       ├── resumes/      CV upload + resume analysis routes (/api/analyze, /api/job-match, ...)
│   │       ├── resume_engine/  Parsing, ATS scoring, recommendations, skills, anonymization, explanations
│   │       └── organizations/ admin/   Planned
│   ├── data/  uploads/       Local SQLite DB and uploaded CVs (gitignored)
│   └── requirements.txt
├── supabase/                 migrations/ and functions/ placeholders (database work deferred)
├── docs/                     PRD, ERD, architecture, API reference, plans
├── CLAUDE.md                 Project rules for Claude Code
└── .env.example              Backend configuration template
```

## Running locally

**Backend** (Python 3.11+), from `backend/`:

```bash
pip install -r requirements.txt
```

```bash
python -m spacy download en_core_web_sm
```

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs are served at http://127.0.0.1:8000/docs.
- Configuration comes from `.env`, either at the repository root or in `backend/`. Copy [.env.example](.env.example) and set at least `JWT_SECRET`.
- The spaCy model matters: without it, the CV anonymizer falls back to regex-only redaction.

**Frontend**, from `frontend/`:

```bash
npm install
```

```bash
npm run dev
```

The dev server runs on http://localhost:8080. Set `VITE_API_BASE_URL` in `frontend/.env`; see [frontend/.env.example](frontend/.env.example).

**Checks**

The project has no automated test files (project rule, see [CLAUDE.md](CLAUDE.md)). Available checks:

- Frontend type check and build, from `frontend/`:

  ```bash
  npx tsc --noEmit -p tsconfig.app.json
  ```

  ```bash
  npm run build
  ```

- Backend: start the API and use the interactive docs at `/docs`.

## Where things moved (2026-11-10 restructure)

| Before | Now |
|---|---|
| `Backend/app/{ats,parser,knowledge,recommendation,validation,services,...}` | `backend/app/modules/resume_engine/` |
| `Backend/app/api.py` | `backend/app/modules/resumes/analysis_router.py` + `analysis_schemas.py` |
| `Hire-geni/backend/main.py` | `backend/app/main.py` + `backend/app/modules/*/router.py` |
| `Hire-geni/backend/{security,auth,db,models,schemas}.py` | `backend/app/core/`, `backend/app/db/`, `backend/app/modules/*/schemas.py` |
| `Hire-geni/backend/agents/` | `backend/app/modules/resume_engine/agents/` (`orchestrator.py` → `modules/recruiters/suggestions.py`) |
| `Hire-geni/frontend/` | `frontend/` |
| `frontend/` (analyzer, React JS) | ported to `frontend/src/modules/job-seeker/resume-analysis/` (the original was removed; it is in git history) |
| `Hire-geni/docs/` | `docs/legacy/hire-geni/` |

All API paths are unchanged.

## Documentation

Start at [docs/README.md](docs/README.md). Product rules: [docs/PRD.md](docs/PRD.md) and [docs/ERD.md](docs/ERD.md). Candidate-platform plan and decisions: [docs/hiregenii/CANDIDATE_PLATFORM_PLAN.md](docs/hiregenii/CANDIDATE_PLATFORM_PLAN.md).
