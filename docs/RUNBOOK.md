# Development runbook

## Prerequisites

- Python and pip
- Node.js and npm

The repository does not specify minimum versions. The commands below are based on the checked-in backend and frontend manifests.

## Configure the environment

The backend reads `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `CEREBRAS_MODEL`, `EXTRACTOR_PROVIDER`, and `MAX_UPLOAD_SIZE_MB`. It checks `backend/.env` first, then the repository-root `.env`. The frontend optionally reads `VITE_API_URL`; its default API URL is `http://localhost:8000`.

The root [.env.example](../.env.example) lists the supported backend variable names with empty key values. Copy it to a local `.env` and supply a key only for the external provider you explicitly select. Keep real credentials private.

The API route defaults to provider `auto`, which selects the local parser. The upload screen also starts with the local parser selected. Neither setting enables automatic AI fallback.

## Install and run the backend

From the repository root:

```powershell
cd backend
python -m pip install -r requirements.txt
python main.py
```

The API listens on port `8000`. Open `http://localhost:8000/docs` for the interactive API reference.

## Install and run the frontend

In a second terminal at the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). The Vite development configuration proxies `/api` and `/health` to `http://localhost:8000`.

## Available API operations

- `GET /` and `GET /health`
- `POST /api/analyze` with a PDF or DOCX `file` and optional `provider` form field
- `GET`, `POST`, and `DELETE /api/knowledge/skills` (DELETE uses `/{raw_term}`)
- `POST /api/job-match` with a job description and skills list

## Troubleshooting notes

- Only PDF and DOCX extensions are accepted. Scanned/image-only PDFs are rejected; OCR is not provided.
- Check that the selected document is readable and contains extractable text.
- Gemini selection requires `GEMINI_API_KEY` and the `google.generativeai` package. That package is not declared in `backend/requirements.txt`, and provider initialization failure does not trigger local-parser fallback.
- Cerebras selection requires `CEREBRAS_API_KEY`; `CEREBRAS_MODEL` defaults to `qwen-3.8-27b`. Resume text is sent to Cerebras when this provider is selected.
- Skill aliases added or deleted through the API exist only in process memory. Unknown-skill counts are written to `backend/app/knowledge/unknown_skills.json`.
- Job matching uses token/substring overlap; it is not semantic matching.

No automated test command is declared in the inspected project manifests. This runbook documents development setup, not test or production deployment readiness.
