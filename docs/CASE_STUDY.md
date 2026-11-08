# AI Resume Analyzer — Case Study Draft

> **Portfolio draft:** This describes the current prototype, not a production SaaS. Add validated results and public links before publishing.

## Turning resume feedback into an actionable workflow

### Overview

AI Resume Analyzer is a web app prototype intended to help job seekers inspect a resume, understand heuristic ATS-style feedback, and compare extracted skills with a target job description. A user uploads a PDF or DOCX and receives structured resume data, a score breakdown, skill and career suggestions, and keyword-match results.

**Role:** Solo project; frontend design contribution  
**Project type:** Personal project  
**Timeline:** Not tracked  
**Status:** Prototype; not deployed or publicly shared yet  
**Demo / repository:** Not available yet  
**Business model:** Not decided

### The problem

The intended users are job seekers who have difficulty identifying which parts of a resume need attention or how their skills relate to a specific job posting. The product hypothesis was that one focused workflow could make resume content easier to inspect and provide practical, understandable next steps.

This is a product hypothesis, not a claim based on completed user research. User validation has not been reported.

### The solution

The prototype combines a React interface with a FastAPI service. Users can:

- Upload a PDF or DOCX resume for analysis.
- Explore extracted contact information, experience, education, and skills.
- Review a rule-based ATS-style score, its criteria breakdown, strengths, and improvement suggestions.
- Paste a job description to see keyword overlap, missing terms, and suggested actions.
- View and edit skill-alias mappings through the app.

The default extraction flow uses local rules. Optional Gemini and Cerebras extractors can be selected explicitly when configured; neither is an automatic fallback.

### How it works

The frontend sends the uploaded document to the API. The backend validates the file, extracts text, parses and normalizes resume fields, calculates a heuristic score, and generates recommendations. The API returns structured JSON for the dashboard and resume explorer. Job matching compares extracted skills with job-description text using token/substring overlap.

**Tech stack:** React 19, Vite, JavaScript, FastAPI, Python, Pydantic, PDF/DOCX parsing libraries, and optional Gemini or Cerebras extraction.

### Product and engineering decisions

- **Explainability over opaque scoring:** The score is presented with criteria and improvement suggestions. It is heuristic feedback, not a prediction of hiring success or a real ATS result.
- **Local-first default:** The default parser can run without an AI-provider key. Gemini and Cerebras are explicit options and send extracted resume text to their external providers.
- **Temporary upload handling:** The API uses a temporary upload for analysis rather than retaining the original document as a user record.
- **Clear boundaries:** Parsing, scoring, recommendations, and API routes are separated into backend modules, with analysis state and API calls handled separately in the frontend.

### Outcome

The result is an end-to-end prototype demonstrating resume upload, structured extraction, score review, and job-keyword comparison in one interface.

**Measured impact:** Not available yet. No user-testing results, extraction-accuracy benchmark, usage analytics, or business outcomes are documented. Do not claim improved interview rates, time saved, model accuracy, or adoption without evidence.

### What I learned

- A useful career tool needs to make its feedback understandable, not just return a score.
- Document parsing and skill normalization are sensitive to resume formats and vocabulary.
- A compelling prototype is not automatically a reliable SaaS: privacy, persistence, security, evaluation, and operational readiness are part of the product.

### Current limitations and next steps

The current app has no user accounts, authentication, durable resume or analysis history, or connected database. Skill mappings are held in memory and reset on restart. Scanned/image-only PDFs are not supported. Scoring and job matching are heuristic; job matching is not semantic. The proposed database design is not implemented. Production monitoring, background jobs, and a tested data-retention/deletion workflow are also not in place.

Before presenting this as a production SaaS, next steps would include:

1. Validate the problem and workflow with target users; define measurable success criteria.
2. Add secure authentication, ownership checks, durable storage, and clear retention/deletion controls—or explicitly keep analysis stateless.
3. Evaluate extraction and scoring against a representative, consented test set, and make uncertainty visible.
4. Review privacy and security for sensitive resume data, including any external AI processing.
5. Add operational monitoring, deployment documentation, and a repeatable test suite.
6. Confirm the intended pricing, target customer, and go-to-market model if describing it as a business.

## Short profile-post version

I designed the frontend for **AI Resume Analyzer**, a web app prototype that turns a resume into structured, actionable feedback. Users can upload a PDF or DOCX, inspect extracted experience and skills, review a transparent heuristic ATS-style score, and compare their skills with a job description.

The prototype uses React and Vite on the frontend and FastAPI on the backend. The project helped me explore how document parsing, skill normalization, explainable feedback, and sensitive career data shape the product experience.

It’s currently a prototype—not a production SaaS—and its scoring and job matching are heuristic. My next focus is validating the workflow with users and addressing privacy, persistence, evaluation, and deployment before making stronger impact claims.

The prototype is not deployed or publicly shared yet, so there are no public demo or repository links. The business model is undecided. Add screenshots and links when available, and keep impact claims limited to results you measure.
