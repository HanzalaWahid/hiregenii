# Project structure

This tree reflects the current React/Vite frontend and FastAPI backend. Generated dependency directories, virtual environments, caches, and local resume files are omitted.

```text
.
├── .env.example
├── README.md
├── backend/
│   ├── .gitignore
│   ├── README.md
│   ├── main.py
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── api.py
│       ├── config.py
│       ├── Courses.py
│       ├── field_rules.json
│       ├── models.py
│       ├── ats/
│       │   ├── engine.py
│       │   └── interfaces.py
│       ├── knowledge/
│       │   ├── repository.py
│       │   ├── unknown_skills.json
│       │   └── __init__.py
│       ├── parser/
│       │   ├── custom_parser.py
│       │   ├── interfaces.py
│       │   ├── llm_extractor.py
│       │   └── text_extraction.py
│       ├── recommendation/
│       │   ├── engine.py
│       │   └── interfaces.py
│       ├── services/
│       │   └── analysis_service.py
│       └── validation/
│           └── validator.py
├── docs/
│   ├── API_OR_SERVICE_FLOW.md
│   ├── DATABASE_DESIGN.md
│   ├── PROJECT_STRUCTURE.md
│   ├── RUNBOOK.md
│   ├── V1_5_ROADMAP.md
│   └── V1_ARCHITECTURE.md
└── frontend/
    ├── .gitignore
    ├── .oxlintrc.json
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── README.md
    ├── vite.config.js
    ├── public/
    └── src/
        ├── App.css
        ├── App.jsx
        ├── index.css
        ├── main.jsx
        ├── assets/
        ├── components/
        ├── context/
        └── utils/
```

## Entry points and responsibilities

- `frontend/src/main.jsx` mounts the React application; `frontend/src/App.jsx` selects the dashboard views.
- `frontend/src/context/ResumeContext.jsx` holds analysis state; `frontend/src/utils/api.js` contains the HTTP client.
- `frontend/vite.config.js` configures the development server and proxies `/api` and `/health` to port `8000`.
- `backend/main.py` starts Uvicorn with `app.api:app`; `backend/app/api.py` defines the FastAPI app, schemas, and routes.
- `backend/app/services/analysis_service.py` orchestrates parser selection, enrichment, normalization, ATS scoring, and recommendations.
- `backend/app/parser/` contains the local parser, optional Gemini and Cerebras extractors, shared LLM prompt, and document text extraction.
- `backend/app/validation/validator.py` validates uploaded PDF/DOCX files.
- `backend/app/knowledge/repository.py` manages in-memory skill aliases and a local unknown-skill count file.
- `backend/app/ats/engine.py` implements rule-based scoring; `backend/app/recommendation/engine.py` implements keyword-based recommendations.
- `backend/app/models.py` contains analysis result dataclasses. Response models are declared in `backend/app/api.py`.

There is no active database package, ORM, migration directory, or authentication module in this structure. The database design document is a proposal.
