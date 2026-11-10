# Product Requirements Document (PRD)

## 1. Product Overview
The Bias-Aware Recruitment Platform helps recruiters evaluate job applications fairly while protecting candidate privacy. The platform anonymizes CVs during initial screening, scores applicants against job requirements, and then lets recruiters request full identity access only after a justified review step.

## 2. Problem Statement
Traditional recruitment pipelines often expose personal information too early. This can reinforce bias based on name, university, gender, and other protected attributes. This platform reduces that risk by:
- anonymizing CV content before initial recruiter review,
- calculating explainable skill-based scores,
- allowing candidate-controlled reveal workflows,
- supporting interview scheduling and recruiter notifications.

## 3. Users
### 3.1 Seeker
- Registers and logs in
- Uploads CVs
- Reviews anonymized profile view
- Receives notifications and reveal requests
- Can approve or reject reveal access
- Can schedule or attend interviews

### 3.2 Recruiter
- Creates jobs
- Reviews applicants for each job
- Ranks candidates using AI scoring
- Shortlists or rejects applications
- Requests full candidate reveal when needed
- Schedules interviews

## 4. Core Functional Requirements
### 4.1 Authentication and Profiles
- Users can register as seeker or recruiter
- JWT-based authentication is used for protected routes
- Recruiters can update company profile details
- Seekers can create/update profile information

### 4.2 CV Processing
- Upload PDF or DOCX CVs
- Extract text using PDF/DOCX parsers
- Anonymize candidate details such as names, email, phone, and institutions
- Generate extracted skills and candidate metadata

### 4.3 Scoring and Ranking
- Applicants are scored against the skills required for a job
- Feature-based explanation is generated per application
- Ranked candidates are exposed through API and UI
- Recruiters can shortlist and reject candidates

### 4.4 Privacy and Reveal Workflow
- Recruiters initially see anonymized versions only
- Access requests can be sent for candidate reveal
- Candidate chooses approve or reject
- Full profile is revealed only after approval

### 4.5 Interview Management
- Recruiters schedule interviews tied to applications and jobs
- Meeting links can be attached
- Interview status is tracked as scheduled/completed/cancelled

### 4.6 Notifications
- Recruiters and seekers receive notifications for actions such as application updates, reveal requests, and interview booking

## 5. Non-Functional Requirements
- Fast API-based backend with GZip compression and middleware timing
- SQLite local database for demo/prototype use
- WebSocket support for live job updates
- This is a prototype system; production hardening is required for scale, auditing, and security review

## 6. Assumptions and Constraints
- The project is designed as a local prototype and not production-hardened yet
- LLM-based explainability may be noisy and should be improved with a more deterministic scoring or fallback flow
- Database is SQLite-backed and suitable for local testing only
- CV anonymization is rule-based and AI-assisted, not a full legal privacy compliance implementation

## 7. Release Scope
The initial v1 scope includes:
- user auth,
- job posting,
- CV upload and processing,
- anonymization,
- ranking and shortlisting,
- reveal workflow,
- interview management.

## 8. Success Metrics
- Recruiter can review candidates without seeing PII up front
- Candidate attractively receives explainable feedback
- Screening decision is faster than manual review
- Shortlisting and intervention flow works end-to-end
