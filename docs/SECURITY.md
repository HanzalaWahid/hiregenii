# Security

## Scope

This is a source-based summary of the current repository. It is not a
penetration test or a review of a live deployment, production configuration,
or Supabase project. No remediation was performed as part of this document
consolidation.

## Current controls

- Candidate/recruiter routes use signed JWTs, password hashes, and
  route-level role or resource checks where implemented.
- Candidate resume uploads have size, extension, and content checks and use
  generated PDF/DOCX storage names.
- Recruiter CV access is intended to show anonymized content until a candidate
  approves identity reveal.
- The resume-analysis API validates uploaded documents and removes its
  temporary directory after processing.

These controls do not establish production readiness or guarantee complete
authorization coverage.

## Known source-level security concerns

| Area | Current evidence | Risk / required follow-up |
|---|---|---|
| API authorization | Resume-analysis routes in `backend/app/modules/resumes/analysis_router.py` and `GET /bias-report` in `backend/app/modules/recruiters/router.py` do not require a JWT. | Decide which routes are intentionally public; add approved authentication, authorization, and abuse controls where required. |
| Resume privacy and retention | `backend/app/modules/resumes/router.py` stores original/anonymized text and removed identity data in `cv_records`, and writes PDF/DOCX files to local `backend/uploads/`. No file cleanup is visible in the upload flow. | Define retention, deletion, filesystem/database access, backup protection, and private storage before production use. |
| WebSocket credentials | `frontend/src/hooks/useJobUpdates.tsx` places the JWT in the `/ws/jobs` query string and logs the URL. The WebSocket handler decodes the token but does not resolve the user or check active status. | Avoid logging credential-bearing URLs; review token transport, access-log redaction, and account-revocation behavior. |
| Browser token storage | `frontend/src/services/api.ts` stores the custom JWT in `localStorage`. | Review the token/session design and strengthen XSS defenses before production deployment. |
| Upload resource use | The resume-analysis route copies the upload before its post-save size validation. | Enforce a request-size limit while receiving data, in addition to document validation. |
| Abuse limits | No application-level rate limiter was found in the inspected route/middleware code. | Set appropriate request, authentication, upload, and external-provider limits. |
| External processing | Selecting an external extractor or explanation provider sends resume-derived content to that provider. | Define user consent, minimization, provider retention, and disclosure requirements. |
| Sensitive logging | `backend/app/modules/jobs/router.py` prints the recruiter email and submitted job payload. | Remove or redact sensitive values and use controlled logging. |
| Local migrations | `backend/app/db/migrations.py` suppresses exceptions while adding profile columns. | Make schema drift observable and keep schema changes reviewable; no production migration workflow is established. |
| Fairness reporting | `/bias-report` is unauthenticated and calculates aggregate metrics from a local CSV. The returned label is not a validated fairness assessment. | Restrict access if needed and validate methodology before using metrics for hiring or compliance claims. |
| Deployment configuration | CORS defaults are development-oriented and allow broad methods/headers for listed origins. | Set and verify environment-specific origins and production controls; CORS is not an authorization boundary. |

## Data and platform boundaries

The application currently uses local SQLite and filesystem storage; no
Supabase Auth, Database, RLS policy, Storage integration, or live schema was
verified. See [DATABASE.md](DATABASE.md) for persistence status and
[API.md](API.md) for route authentication declarations.

Resumes and candidate profiles are sensitive personal data. Do not log full
resume contents, removed identity values, tokens, or request bodies. Production
retention, deletion, backup, incident response, and provider-consent
requirements remain unresolved in [PRD.md](PRD.md).
