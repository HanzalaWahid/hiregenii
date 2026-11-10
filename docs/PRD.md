# HireGenii Product Requirements Document

**Status:** Working requirements baseline, consolidated from the former Hire-geni requirements and current source inspection. Confirmed business requirements, current implementation, proposed scope, and unresolved decisions are identified separately below.

## 1. Product vision

HireGenii is intended to bring candidate resume analysis and job-seeking workflows together with recruiter hiring workflows. The product direction describes a coherent candidate profile and resume-analysis capability that may support job discovery, applications, and recruiter review. AI scores and recommendations are advisory; a human recruiter remains responsible for application decisions.

The former AI Resume Analyzer and Hire-geni applications now share one frontend and one FastAPI application. Their authentication and persistence flows remain distinct; this is not yet a unified identity or data platform.

## 2. Problem statement

The existing Hire-geni PRD identifies early exposure of personal information and bias in recruitment as problems. It documents an anonymized initial screening stage, explainable skill-based scoring, candidate-controlled identity reveal, interviews, and notifications. The separate Resume Analyzer focuses on extracting resume information, heuristic ATS scoring, and keyword-based recommendations/matching. There is no integrated account or persistence layer shared between these applications.

## 3. Users and roles

| Role | Documented requirements | Current implementation |
|---|---|---|
| Job seeker / seeker | Register, manage profile and CV, see anonymized profile, receive notifications and reveal requests, approve/reject reveal, and participate in interviews | Hire-geni user role `seeker`; pages and protected API workflows exist |
| Recruiter | Manage company profile, post jobs, review/rank applications, shortlist/reject, request reveal, schedule interviews | Hire-geni user role `recruiter`; pages and protected API workflows exist |
| Platform administrator | Requested as a product module in the supplied project brief, but not specified by the existing Hire-geni PRD | No admin role, page, endpoint, or database entity found |

Organizations and tenant-level membership are not present in the current data model; a recruiter profile is associated with one user.

## 4. Product scope

### 4.1 Documented Hire-geni v1 scope

The existing PRD includes authentication, job posting, CV upload/processing, anonymization, ranking and shortlisting, identity reveal, and interview management. Its non-functional requirements identify FastAPI, SQLite for local prototype use, and WebSocket support for live job updates. The document explicitly characterizes the product as a prototype requiring production hardening.

### 4.2 Existing Resume Analyzer scope

The root application implements PDF/DOCX extraction, structured resume analysis, rule-based ATS scoring, skill normalization, career recommendations, and keyword-overlap job-description matching. It is not currently connected to Hire-geni accounts or data.

### 4.3 Proposed unified scope

The supplied target direction is one frontend organized into auth, job seeker, recruiter, and admin modules; one modular FastAPI backend; Supabase for managed authentication, database, RLS, storage, and Realtime; and shared Python resume-analysis functionality. This direction is proposed architecture, not an implemented requirement contract. Admin capabilities, organization tenancy, data migration, retention, and detailed application lifecycle need product decisions before implementation.

## 5. Functional requirements and evidence

The “existing requirement” column summarizes the Hire-geni PRD. “Current evidence” reports code behavior and is not an assertion that the behavior has been end-to-end tested.

| ID | Requirement / behavior | Current evidence and discrepancy |
|---|---|---|
| AUTH-1 | Users register and log in as seeker or recruiter; protected routes use JWT authentication | Candidate/recruiter routes use JWT through `backend/app/core/`; resume-analysis routes do not declare API authentication |
| PROF-1 | Seekers manage profile information; recruiters manage company details | Hire-geni endpoints and pages exist; there is no organization entity |
| RES-1 | Upload PDF or DOCX CV, extract content, and create candidate data | Hire-geni accepts PDF, DOCX, and TXT; stores text and parsed output in SQLite. Analyzer accepts PDF/DOCX and returns analysis without persistence |
| PRIV-1 | Initial recruiter review is anonymized; candidate controls identity reveal | Hire-geni stores original and anonymized text and an application-level reveal status; access logic is implemented in CV detail and reveal routes |
| SCORE-1 | Score applicants against job skills and explain the score | Hire-geni feature scoring and explanations exist; job-related scoring is rule-based. Analyzer has a distinct resume-quality ATS score |
| DEC-1 | Recruiter reviews and makes shortlist/reject decisions | Hire-geni has explicit human actions. Shortlist suggestions and the legacy auto-shortlist route are read-only; AI does not change application status |
| APP-1 | One application belongs to one candidate and one job; repeated application is rejected | SQLAlchemy unique index on `(job_id, user_id)` and duplicate handling are present |
| INT-1 | Recruiter schedules interviews for applicants and interview status is tracked | Scheduling and listing routes exist. The supplied PRD also names completed/cancelled statuses; there is no status-update endpoint in the inspected API |
| NOTIF-1 | Notify seekers and recruiters about application, reveal, and interview events | Persistent notifications plus in-process WebSocket messages exist; delivery is process-local |
| ADM-1 | Admin module: platform, organization, and user administration | No source-backed requirements or implementation. Proposed only; do not infer permissions or workflows |
| UNI-1 | Integrate both apps into one product with shared candidate profile and resume-analysis capability | Proposed target; no shared identity, database, or API integration found |

## 6. User workflows

### 6.1 Job seeker (current Hire-geni)

1. Register/login as a seeker.
2. Maintain seeker profile and upload a CV.
3. Optionally apply during upload or apply later with the current CV.
4. Review applications and notifications.
5. Respond to identity-reveal requests and view interviews.

The resume-analysis flow is integrated into the seeker interface, but remains a distinct API workflow: it returns analysis data and keeps current results in frontend context. It has no analysis-history workflow and its routes do not require a JWT.

### 6.2 Recruiter (current Hire-geni)

1. Register/login as a recruiter and complete a recruiter profile.
2. Create jobs.
3. Review candidates for owned jobs using anonymized data and scoring.
4. Shortlist/reject manually, optionally inspect read-only shortlist suggestions, and request identity reveal.
5. Schedule interviews for applicants and review notifications/interviews.

### 6.3 Admin

No implementable admin workflow can be derived from the existing PRD/ERD or source. Platform-admin powers, organization onboarding/approval, moderation, audit, and monitoring are open product decisions.

## 7. Non-functional requirements

### Existing requirements

- The Hire-geni PRD requires a FastAPI API, local SQLite prototype storage, GZip/timing middleware, and WebSocket support for live job updates.
- It calls for production hardening for scale, auditing, and security.
- Resume anonymization and AI-assisted explanations are not a legal compliance guarantee.

### Proposed requirements (approval required)

- Consolidate into the supplied one-frontend/one-backend directory structure.
- Supabase-managed Auth, database, RLS, Storage, and Realtime; no separate managed PostgreSQL server.
- Keep uploaded resumes private and enforce user/organization ownership at data and storage boundaries.
- Extract reusable Python analysis logic only after dependency review.
- Define availability, performance, accessibility, retention/deletion, observability, recovery, and supported-browser targets before production readiness.

No numerical service-level objectives, data-retention periods, accessibility conformance level, or production scaling targets are established by the current PRD.

## 8. Security, privacy, and AI decision requirements

- The existing PRD requires recruiter screening to begin with anonymized candidate information and full reveal only after candidate approval.
- Candidate resume content and PII are sensitive; external-provider use must be made explicit. The Analyzer sends resume text to Gemini or Cerebras when selected.
- AI ranking/scoring is advisory, not a final recruiter decision. Human shortlist/reject status is stored separately from suggestions.
- Current JWT authentication and owner/job checks exist in Hire-geni; there is no Supabase Auth or RLS integration.
- Define consent, retention, deletion, auditing, organization isolation, and access revocation for the unified product before implementing its data design.

## 9. Acceptance criteria

The following criteria preserve existing requirements; they are not claims of current end-to-end verification.

| Area | Acceptance criteria |
|---|---|
| Authentication | Only a registered, active user with a valid token can access protected API actions; role-specific actions reject the wrong role |
| Resume privacy | Recruiters reviewing an application see anonymized resume content before the candidate approves reveal; raw PII is not present in pre-reveal responses or notifications |
| Job ownership | Recruiter actions on jobs and applications are limited to jobs owned by that recruiter |
| Scoring/decisions | Job-fit score and explanation are presented as advisory; application status changes only after explicit recruiter action |
| Application lifecycle | A candidate cannot create duplicate applications to the same job; status and reveal state are distinguishable |
| Interviews/notifications | Interview scheduling is limited to an owned job and an actual applicant; relevant user notification is persisted and delivered through the documented mechanism |
| Unified target | Before integration is accepted, the single frontend and modular backend use one agreed identity/profile contract and the approved storage/authorization design |
| Admin | Acceptance criteria remain undefined until role privileges, organization scope, and admin workflows are approved |

## 10. Out of scope and open decisions

### Not established by existing requirements

- Admin powers, organization management, tenant membership, or recruiter organization approval.
- External job tracking, resume builder/version history, cover letters, AI rewriting, interview preparation, or PDF export. These appeared in a separate planning draft but are not confirmed requirements.
- Supabase schema, RLS policies, migration of SQLite/local files, and live database contents.
- Production deployment topology, SLOs, rate limits, and data retention/deletion periods.
- Legal/privacy compliance certification or a guarantee that anonymization removes all identifying data.

### Decisions required

1. What account/profile is canonical across candidate and recruiter workflows?
2. Should organizations and multiple recruiter memberships be introduced? What is the tenant boundary?
3. What admin actions and safeguards are required?
4. How should current SQLite data, uploaded files, and analysis state be handled?
5. Which resume data may be sent to each AI provider, under what consent and retention terms?
6. Should interview status mutation, cancellation, and candidate rescheduling be supported?
7. What production security, performance, availability, and compliance criteria apply?

## 11. Source of truth and discrepancies

The documented v1 business requirements are consolidated here and compared with current entities in [ERD.md](ERD.md). Current implementation is described in [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) and [API.md](API.md); neither planned Supabase services nor candidate-platform concepts should be read as implemented functionality.
