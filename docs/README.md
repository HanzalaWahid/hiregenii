# HireGenii documentation

## Overview

The repository now has one React/TypeScript frontend and one modular FastAPI
backend. The resume-analysis, seeker, and recruiter experiences are integrated
into the same application. Their API routes and persistence flows remain
distinct: resume-analysis results are transient, while candidate, job, and
application records use local SQLite.

Supabase Auth, managed database, Storage, and Realtime remain planned; no live
Supabase schema or integration is documented here.

## Product modules

| Module | Current evidence | Status |
|---|---|---|
| Job seeker | Profile, CV upload, jobs, applications, interviews, and resume-analysis pages | Implemented in the frontend; API workflows have not been end-to-end verified here |
| Recruiter | Job posting, candidate screening, shortlist/reject, identity reveal, and interviews | Implemented in the frontend; API workflows have not been end-to-end verified here |
| Admin | Empty placeholder; no implemented role, page, or API | Proposed; scope and permissions are undecided |

## Documentation map

- [Product requirements](PRD.md) — documented requirements, current evidence, gaps, and decisions.
- [Entity relationships](ERD.md) — current SQLAlchemy models and separately labeled proposals.
- [System architecture](SYSTEM_ARCHITECTURE.md) — current merged application and planned platform services.
- [API reference](API_REFERENCE.md) — routes in the current FastAPI application.
- [API and service flow](API_OR_SERVICE_FLOW.md) — application entry points and major request flows.
- [Project structure](PROJECT_STRUCTURE.md) — current repository layout.
- [Features and workflows](FEATURES_AND_WORKFLOWS.md) — feature inventory and user journeys.
- [Security review](SECURITY_REVIEW.md) — source-based risks and recommendations.
- [Implementation roadmap](IMPLEMENTATION_ROADMAP.md) — proposed sequencing, not implementation authorization.

## Historical and planning documents

Original Hire-geni product documents are preserved in
[legacy/hire-geni](legacy/hire-geni/). The
[candidate platform plan](hiregenii/CANDIDATE_PLATFORM_PLAN.md) and other
architecture/roadmap documents contain proposals; they do not establish that
those features or services are implemented.

## Documentation status

These are source-based working documents, not approval of new product scope.
Current API/database statements refer to the repository source, not a live
deployment. The backend still uses local SQLite and custom JWT authentication.
Supabase integration, organization tenancy, and admin workflows remain
unimplemented or undecided. End-to-end application workflows were not run as
part of this documentation update.
