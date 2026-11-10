# API Reference

This reference is derived from route declarations in the current FastAPI
application. Resume-analysis and candidate/recruiter endpoints are mounted in
the same process, but use distinct route modules and data flows. Unless noted
otherwise, “JWT required” means the application's custom bearer JWT.
FastAPI validation and response-model details may add standard error
responses. Runtime contracts were not exercised as part of this documentation
update.

## 1. Resume-analysis routes

Source: `backend/app/main.py`; routes are in
`backend/app/modules/resumes/analysis_router.py`, schemas in
`backend/app/modules/resumes/analysis_schemas.py`, and processing code in
`backend/app/modules/resume_engine/`. Base URL during local development is
normally `http://127.0.0.1:8000`.

| Method and route | Auth | Request | Response / behavior |
|---|---|---|---|
| `GET /` | None | None | Welcome message and docs path |
| `GET /health` | None | None | `{status, version, providers}` |
| `POST /api/analyze` | None | Multipart: required `file` (PDF/DOCX), optional `provider` (`auto`, `custom_rule`, `gemini`, `cerebras`; default `auto`) | `AnalysisResponse`: success, filename, provider/fallback/confidence, parsed personal info, skills, experience, projects, education, ATS breakdown, recommendation |
| `GET /api/knowledge/skills` | None | None | `{mappings: [{raw, normalized, category}]}` from in-memory aliases |
| `POST /api/knowledge/skills` | None | JSON `{raw, normalized, category}`; category is accepted by schema | `{success, message}`; route checks raw/normalized and duplicate alias; alias is in-memory |
| `DELETE /api/knowledge/skills/{raw_term}` | None | Path `raw_term` | `{success, message}`; 404 if alias absent |
| `POST /api/job-match` | None | JSON `{job_description: string, skills: string[]}` | `JobMatchResponse`: `match_score`, missing/matching keywords, action plan, fit analysis, suggested improvements |

`POST /api/analyze` returns 422 for unsupported/invalid uploads, 500 for an unhandled processing failure. Knowledge routes use 400 for missing alias values, 409 for duplicates, and 404 for absent aliases. Job matching returns 400 for empty description. Other failures follow FastAPI behavior.

These routes are mounted in the same FastAPI application as the other modules,
but their handlers do not declare an authentication dependency or per-user
ownership check. The seeker UI is under a frontend protected route; that does
not provide API authorization.

## 2. Candidate and recruiter routes

Source: `backend/app/main.py` and the routers assembled by
`backend/app/api/router.py`; request/response types are in
`backend/app/modules/*/schemas.py`. Most data operations use SQLite/SQLAlchemy
through `backend/app/db/`. Endpoints below are grouped by workflow.

### Health and connection

| Method and route | Auth | Request | Response / behavior |
|---|---|---|---|
| `GET /` | None | None | `{message}` |
| `WS /ws/jobs?token=...` | JWT supplied in query parameter | WebSocket connection; client sends text to keep connection open | Server sends JSON events for jobs, applications, and notifications; token claims must contain `uid` |

### Authentication and profiles

| Method and route | Auth | Request | Response / behavior |
|---|---|---|---|
| `POST /auth/register` | None | JSON `RegisterRequest`: `full_name`, `email`, `password`, `role` (`seeker`/`recruiter`) | `RegisterResponse`: public user, `access_token`, `token_type`; 409 if email exists |
| `POST /auth/login` | None | JSON `{email, password}` | Same response shape; 401 for invalid/inactive account |
| `GET /auth/me` | JWT | None | `UserPublic` |
| `GET /profile/me` | JWT | None | Own profile; empty arrays if no profile row |
| `PUT /profile/me` | JWT | JSON `{skills, experience, education, phone?, address?, current_university?}` | Own `ProfileResponse` |
| `GET /profile/recruiter` | JWT, recruiter role | None | Own recruiter profile; 403 wrong role, 404 if absent |
| `PUT /profile/recruiter` | JWT, recruiter role | JSON `{company_name, company_website?, location, industry?, company_description?}` | Updated recruiter profile |

### Jobs and applications

| Method and route | Auth | Request | Response / behavior |
|---|---|---|---|
| `GET /jobs` | None | None | Job list with company name and applicant count |
| `GET /jobs/my` | JWT, recruiter role | None | Current recruiter's jobs |
| `GET /jobs/{job_id}` | None | Path `job_id` | `JobPublic`; 404 if absent |
| `POST /jobs` | JWT, recruiter role + recruiter profile | JSON `JobCreate`: `title`, `description`, `experience_level`, `required_skills` (skill/weight items) | `JobPublic`; broadcasts `new_job` to seekers |
| `GET /applications/my` | JWT | None | See discrepancy note below; intended response is current seeker's application list with status and explanation fields |
| `POST /cv/apply-current?job_id=...` | JWT | Required query `job_id` | `{message, job_title}`; applies using latest CV; duplicate returns 409 |

There are two `GET /applications/my` route declarations in
`backend/app/modules/applications/router.py`. One returns ORM application
objects; a later declaration checks seeker role and builds a richer list. The
effective routing/OpenAPI behavior should be confirmed before treating either
response as a stable contract.

### Resume / candidate

| Method and route | Auth | Request | Response / behavior |
|---|---|---|---|
| `POST /cv/upload` and alias `POST /upload_cv/` | JWT | Multipart `file`; optional query `job_id`, `fair_mode`, `remove_institute` | Candidate analysis payload with `candidate_id`, optional `job_context`, `toggle_view`, CV texts/removed fields, extracted fields, scoring, explanations, recommendations; optionally creates application and recruiter notification |
| `POST /cv/re-process?fair_mode=...` | JWT | Optional boolean query `fair_mode` (default true) | `{message, candidate_id, skills_extracted, experience_years, anonymization_applied}` |
| `GET /cv/my/latest` | JWT | None | Latest own CV record and analysis; 404 if none |
| `GET /cv/{cv_id}?job_id=...` | JWT | Path `cv_id`, optional query `job_id` | CV detail. Owner sees own data; recruiter must own the relevant job/application; PII is gated by reveal approval |
| `POST /cv/anonymize?remove_institute=...` | JWT | JSON `{text: string}`; optional query bool default true | Original/anonymized text and removed email/phone/name/institute/address |
| `GET /bias-toggle/{candidate_id}?job_id=...` | JWT | Path candidate; optional `job_id`, default 1 | Normal/anonymized comparison and bias-impact data; visibility restricted to owner or relevant job owner |
| `GET /recommend/{candidate_id}` | JWT, CV owner | Path candidate id | `{candidate_id, recommendations}`; 404 for other/nonexistent CV |

Candidate CV upload supports PDF, DOCX, and UTF-8 TXT. The response and stored
fields include sensitive resume data; see [security review](SECURITY_REVIEW.md).

### Ranking, decisions, and reveal

| Method and route | Auth | Request | Response / behavior |
|---|---|---|---|
| `GET /rank/{job_id}` | JWT, owner of job/recruiter role | Path `job_id` | `{job_id, top_5}`; ranked applications with candidate identifier, score, skills, experience and status |
| `POST /rank/{job_id}/shortlist/{candidate_id}` | JWT, owner of job/recruiter role | Path job and CV candidate id | `{status, is_shortlisted}`; toggles shortlisted/applied and notifies seeker when shortlisted |
| `GET /applications/my` | JWT, seeker role | None | Rich application list includes job, status, score, decision, explanation, suggestions, missing skills, reveal state, creation time (duplicate route caveat above) |
| `GET /shortlisted` | JWT | None | Applications for jobs owned by caller, with candidate summary and reveal state |
| `POST /applications/{app_id}/shortlist` | JWT, owner of related job | Path application id | `{message}`; sets status and notifies seeker |
| `POST /applications/{app_id}/reject` | JWT, owner of related job | Path application id | `{message}`; sets status, updates explanation and notifies seeker |
| `POST /applications/{app_id}/request-reveal` | JWT, owner of related job | Path application id | `{message}`; sets pending state and notifies candidate |
| `POST /applications/{app_id}/respond-reveal` | JWT, owner of application as seeker | Path application id; JSON `{approved: boolean}` | `{message, reveal_status}`; notifies recruiter |
| `POST /applications/request-reveal-by-cv/{cv_id}?job_id=...` | JWT; delegates to reveal endpoint | Path CV id; required query job id | Same response as reveal request |
| `POST /jobs/{job_id}/shortlist-suggestions` and alias `POST /jobs/{job_id}/auto-shortlist` | JWT, owner of job/recruiter role | Path job; optional query `threshold` from 0 to 100 | Read-only suggestions from `ShortlistSuggestionService`; does not change application status |

### Notifications and interviews

| Method and route | Auth | Request | Response / behavior |
|---|---|---|---|
| `GET /notifications` | JWT | None | Current user's notifications, newest first |
| `PATCH /notifications/{notif_id}/read` | JWT, notification owner | Path notification id | `{success: true}`; 404 if not owned/found |
| `PATCH /notifications/read-all` | JWT | None | `{success: true}`; marks only caller's notifications |
| `POST /interviews` | JWT, recruiter owning job | JSON `{job_id, user_id, scheduled_at, meeting_link?}`; target user must have applied | `InterviewPublic`; creates notification and sends WebSocket event |
| `GET /interviews/my` | JWT | None | Interviews for caller as seeker |
| `GET /interviews/recruiter` | JWT, recruiter role | None | Interviews for jobs owned by caller |

### Bias report

| Method and route | Auth | Request | Response / behavior |
|---|---|---|---|
| `GET /bias-report` | None in route | None | `{bias_detected, metrics: {demographic_parity, equal_opportunity}, summary}` based on local CSV; if unavailable returns zero metrics and unavailable summary |

The current response labels/threshold are code-derived and are not a validated fairness assessment. This endpoint's unauthenticated exposure is flagged in [security review](SECURITY_REVIEW.md).

## 3. Current integration boundaries

All listed routes are served by the same FastAPI application. The resume-analysis
routes return transient analysis results and do not require a JWT at the API
layer. Candidate, job, application, recruiter, interview, and notification
routes use the custom JWT and local SQLite data where declared above.

Supabase Auth, database, Storage, and RLS are not integrated. A future
consolidation of identity, storage, and authorization must not be inferred from
the shared application entry point. The duplicate `GET /applications/my`
declarations remain a route-contract caveat; confirm effective behavior before
relying on a particular response shape.
