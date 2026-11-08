# FastAPI backend

The backend exposes the resume analysis API used by the React frontend. Its analysis pipeline validates an uploaded document, extracts text, selects a parser, normalizes skills, calculates a rule-based ATS score, and produces keyword-based recommendations.

## Requirements and setup

From the repository root:

```powershell
cd backend
python -m pip install -r requirements.txt
```

Start the development server from the `backend/` directory:

```powershell
python main.py
```

The server listens on port `8000`. Interactive API documentation is available at `http://localhost:8000/docs`.

## Configuration

The backend reads these variables from the process environment or a `.env` file:

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | unset | API key used by the optional Gemini extractor. |
| `CEREBRAS_API_KEY` | unset | API key used by the optional Cerebras extractor. |
| `CEREBRAS_MODEL` | `qwen-3.8-27b` | Model ID sent to Cerebras shared inference. |
| `EXTRACTOR_PROVIDER` | `auto` | Service default when a provider is not passed. `auto` selects the local parser; it does not perform fallback. |
| `MAX_UPLOAD_SIZE_MB` | `5.0` | Maximum size checked by resume validation. |

Configuration checks for `backend/.env` first, then the repository-root `.env`. Use the root [.env.example](../.env.example) as a variable-name reference; do not put real credentials in documentation or commit them.

The Gemini extractor imports `google.generativeai`, but that SDK is not listed in [requirements.txt](requirements.txt). Gemini operation therefore is not reproducible from the backend manifest alone.

Cerebras uses the `requests` dependency already listed in [requirements.txt](requirements.txt) and calls the Cerebras chat-completions API. The default model is `qwen-3.8-27b`; set `CEREBRAS_MODEL` to a currently supported model ID if you want to use another model.

## Implemented modules

- `app/api.py`: FastAPI application, response schemas, and routes.
- `app/services/analysis_service.py`: parser selection, enrichment, skill normalization, scoring, and recommendations.
- `app/parser/custom_parser.py`: default local rule-based parser with optional spaCy assistance.
- `app/parser/llm_extractor.py`: explicitly selected Gemini extractor.
- `app/parser/cerebras_extractor.py`: explicitly selected Cerebras extractor.
- `app/parser/text_extraction.py`: PDF and DOCX text extraction.
- `app/validation/validator.py`: extension, size, signature, integrity, and text checks.
- `app/knowledge/repository.py`: in-memory skill aliases and local unknown-skill count file.
- `app/ats/engine.py`: explainable rule-based ATS scoring.
- `app/recommendation/engine.py`: keyword-based field, skill, and course recommendations.

## API routes

- `GET /` and `GET /health`
- `POST /api/analyze`
- `GET /api/knowledge/skills`
- `POST /api/knowledge/skills`
- `DELETE /api/knowledge/skills/{raw_term}`
- `POST /api/job-match`

Request and response schemas are defined in `app/api.py`; the running API's OpenAPI documentation is at `/docs`.

## Runtime and data limitations

- The analyze route defaults to provider `auto`, which selects the local rule-based parser. The frontend currently sends `custom_rule` by default.
- Cerebras can be selected in the upload screen; it requires `CEREBRAS_API_KEY`. Resume text is sent to Cerebras when selected.
- There is no automatic parser/provider fallback. Gemini initialization failure does not switch to the local parser.
- Skill alias changes are held in process memory and are lost when the service restarts.
- Unknown skills are counted in `app/knowledge/unknown_skills.json`.
- Uploaded resumes are temporarily written for analysis and removed by the request handler.
- No database, authentication, OCR, or durable analysis history is implemented.

For the complete local workflow and known issues, see the [runbook](../docs/RUNBOOK.md).
