# AI Resume Analyzer

AI Resume Analyzer is a React and FastAPI application that extracts information from PDF and DOCX resumes, calculates a rule-based ATS-style score, and provides keyword-based career and skill recommendations.

## Current features

- Upload and validate text-based PDF or DOCX resumes.
- Extract resume text and structured fields using a local rule-based parser with optional spaCy assistance.
- Optionally select the Gemini or Cerebras extractor.
- Normalize skills using an in-process alias map and record unknown skills in a JSON file.
- Return an explainable ATS score and heuristic career recommendations.
- Compare a job description with supplied resume skills using keyword overlap.
- View and modify skill aliases through the API.

The application does not currently provide accounts, authentication, durable database storage, OCR, or automatic AI-provider fallback. See [Known limitations](#known-limitations).

## Architecture

```text
React/Vite frontend
  -> FastAPI API
      -> upload validation and temporary file handling
      -> local rule-based parser or explicitly selected Gemini/Cerebras extractor
      -> skill normalization
      -> rule-based ATS scoring
      -> keyword-based recommendations
  -> JSON analysis response
```

## Technology

- **Frontend:** React 19, Vite, JavaScript, CSS modules and custom CSS
- **Backend:** Python, FastAPI, Pydantic, Uvicorn
- **Parsing:** PyPDF2, pdfminer.six fallback, docx2txt, and optional spaCy model support
- **Optional AI extraction:** Google Gemini (`provider=gemini`) or Cerebras (`provider=cerebras`)

Dependency manifests are [frontend/package.json](frontend/package.json) and [backend/requirements.txt](backend/requirements.txt).

## Repository structure

```text
.
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── app/
│       ├── api.py
│       ├── config.py
│       ├── ats/
│       ├── knowledge/
│       ├── parser/
│       ├── recommendation/
│       ├── services/
│       └── validation/
├── docs/
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
├── .env.example
└── README.md
```

## Requirements

- Python and pip
- Node.js and npm

The repository does not specify minimum versions for these tools. The backend starts on port `8000`; the Vite development server uses port `5173`.

## Environment configuration

The backend reads `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `CEREBRAS_MODEL`, `EXTRACTOR_PROVIDER`, and `MAX_UPLOAD_SIZE_MB`. Configuration loads a `.env` from `backend/` if present, otherwise from the repository root. The frontend optionally reads `VITE_API_URL`; without it, the API client uses `http://localhost:8000`.

Copy [.env.example](.env.example) to a local `.env` and set values as needed. Keep real credentials out of source control.

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | unset | Key read by the optional Gemini extractor. |
| `CEREBRAS_API_KEY` | unset | Key read by the optional Cerebras extractor. |
| `CEREBRAS_MODEL` | `qwen-3.8-27b` | Cerebras model ID. The default is the smaller of the two models listed for shared inference in the current Cerebras model catalog; availability and pricing can change. |
| `EXTRACTOR_PROVIDER` | `auto` | Provider default read by the service when no provider is supplied. `auto` selects the local rule-based extractor; it does not trigger AI fallback. |
| `MAX_UPLOAD_SIZE_MB` | `5.0` | Maximum upload size checked by resume validation. |
| `VITE_API_URL` | `http://localhost:8000` | Optional frontend API base URL. |

The `/api/analyze` route defaults its provider form field to `auto`; the frontend starts with the local rule-based extractor selected. Select Gemini or Cerebras explicitly in the upload screen. Cerebras uses the existing `requests` dependency and the `qwen-3.8-27b` default model; set `CEREBRAS_MODEL` to another supported model ID if needed. The Gemini SDK is not listed in `backend/requirements.txt`, so the Gemini path is not fully reproducible from the provided backend manifest alone.

## Run locally

In a terminal at the repository root, start the backend:

```powershell
cd backend
python -m pip install -r requirements.txt
python main.py
```

In a second terminal at the repository root, start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the frontend URL printed by Vite (normally `http://localhost:5173`). The backend API documentation is available at `http://localhost:8000/docs`. The Vite development configuration proxies `/api` and `/health` to the backend.

## API overview

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | API welcome response |
| `GET` | `/health` | Health and advertised provider names |
| `POST` | `/api/analyze` | Analyze a PDF or DOCX upload; multipart fields are `file` and optional `provider` |
| `GET` | `/api/knowledge/skills` | List in-memory skill aliases |
| `POST` | `/api/knowledge/skills` | Add an in-memory skill alias |
| `DELETE` | `/api/knowledge/skills/{raw_term}` | Remove an in-memory skill alias |
| `POST` | `/api/job-match` | Compare `job_description` text with a supplied `skills` list |

See the interactive API documentation at `/docs` while the backend is running.

## Data handling and storage

Uploaded files are written to a temporary directory for analysis and then removed by the API handler. The active application does not store accounts, uploaded resumes, analysis records, or feedback in a database. Skill aliases are held in memory and reset on process restart. Unknown-skill counts are stored in `backend/app/knowledge/unknown_skills.json`.

When Gemini or Cerebras is selected, extracted resume text is sent to that external provider. Use only with appropriate consent and data-handling practices.

## Known limitations

- Parsing and ATS scoring are heuristic and can vary by resume layout and content.
- Image-only/scanned PDFs are rejected; OCR is not implemented.
- `auto` selects the local parser; automatic fallback or provider routing is not implemented.
- Gemini initialization can fail if its SDK is unavailable or configuration is missing; the service does not then fall back to the local parser.
- The Gemini SDK is not included in the backend dependency manifest.
- Cerebras model availability, rate limits, and pricing are controlled by Cerebras and may change.
- Job matching uses token/substring overlap, not semantic matching.
- Skill alias edits are not persisted; the unknown-skill JSON file is a local file, not a database.
- No authentication or authorization is implemented for the API.
- The database design document describes a proposal, not an implemented database.
- No automated test suite was found in the repository during documentation review; runtime behavior has not been verified by this README update.

## Documentation

- [Backend setup and development](backend/README.md)
- [Frontend setup and development](frontend/README.md)
- [Runbook](docs/RUNBOOK.md)
- [Architecture](docs/V1_ARCHITECTURE.md)
- [API and service flow](docs/API_OR_SERVICE_FLOW.md)
- [Project structure](docs/PROJECT_STRUCTURE.md)
- [Proposed database design](docs/DATABASE_DESIGN.md)
- [V1.5 roadmap](docs/V1_5_ROADMAP.md)
