# API and service flow

The FastAPI application and routes are defined in `backend/app/api.py`. The server entry point is `backend/main.py`, which starts `app.api:app`.

## Implemented routes

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/` | Returns the API welcome message and docs path. |
| `GET` | `/health` | Returns a health status, version, and provider labels. |
| `POST` | `/api/analyze` | Accepts multipart `file` and optional `provider` form fields; returns parsed resume data, ATS scoring, and recommendations. |
| `GET` | `/api/knowledge/skills` | Returns the current in-memory alias mappings. |
| `POST` | `/api/knowledge/skills` | Adds an alias to the in-memory mapping. |
| `DELETE` | `/api/knowledge/skills/{raw_term}` | Removes an alias from the in-memory mapping. |
| `POST` | `/api/job-match` | Compares job-description tokens with a supplied list of skills. |

Interactive request/response schemas are available at `/docs` when the API is running.

## Resume analysis flow

1. The route accepts a PDF or DOCX filename and provider form value.
2. It copies the upload to a temporary directory and closes the upload stream.
3. The service validates extension, size, signature, document integrity, and extractable text.
4. The service selects `CustomRuleBasedExtractor` for `auto` and `custom_rule`; `gemini` selects `GeminiExtractor`, and `cerebras` selects `CerebrasExtractor`.
5. The selected extractor obtains PDF/DOCX text and returns parsed fields. The local parser uses deterministic rules and optional spaCy model support; Gemini and Cerebras send extracted text to their configured external APIs.
6. The service enriches parsed fields, normalizes skills, writes unknown-skill counts to `backend/app/knowledge/unknown_skills.json`, and calculates candidate level and confidence values.
7. The rule-based ATS scorer and keyword-based recommendation engine produce results.
8. The route serializes the result into the API response and removes the temporary directory in its main processing `finally` block.

The actual response schema is `AnalysisResponse` in `backend/app/api.py`. It includes `provider_used`, `fallback_used`, and `confidence_score` fields.

## Provider behavior

The API route defaults its form field to `auto`; the frontend starts with the local parser selected. Both `auto` and `custom_rule` select the local parser. `gemini` and `cerebras` must be explicitly selected. Although the service reports `fallback_used`, it initializes the value to false and does not implement automatic fallback. Cerebras requires `CEREBRAS_API_KEY` and defaults to `qwen-3.8-27b` (`CEREBRAS_MODEL` can override it). Gemini initialization does not switch to the local parser, and the Gemini SDK is not listed in the backend requirements manifest.

`EXTRACTOR_PROVIDER` is read by the analysis service when no provider argument is supplied. The analyze route currently passes its own form-field default, so setting that environment variable alone does not change the route's default.

## Knowledge and matching behavior

- Skill aliases are held in the service's in-memory `KnowledgeRepository`; API changes are not persisted and reset on process restart.
- Unknown-skill occurrence counts are stored in `backend/app/knowledge/unknown_skills.json`.
- Job matching tokenizes the supplied description, removes a small set of stop words, and compares tokens with the supplied skills using substring overlap. It is not semantic/embedding-based matching.

## Persistence

The analysis route uses temporary upload storage and removes the temporary directory after the main processing block. The active SaaS API does not write analysis results or user data to a database. See [DATABASE_DESIGN.md](DATABASE_DESIGN.md) for a separately labeled database proposal.
