# HireGenii — Candidate Platform Plan (Enhancv benchmark)

**Status:** Planning document. No feature code has been written for anything in this plan.
**Date:** 2026-11-10
**Scope:** Candidate-side features (resume builder, ATS checker, AI copilot, tailoring, cover letters, application tracker, interview prep) on top of the unified HireGenii platform. Recruiter features are preserved and out of scope except where data is shared.

How to read this document:

- **Verified** = checked against the current source code (file paths given).
- **Proposed** = a design recommendation that needs approval before implementation.
- **Per brief** = Enhancv capabilities as described in the product brief. They were not independently verified against enhancv.com.

---

## 1. Where we are today

### 1.1 Two applications, one product

| | AI Resume Analyzer | Hire-geni |
|---|---|---|
| Location | `Backend/`, `frontend/` | `Hire-geni/backend/`, `Hire-geni/frontend/` |
| Backend | FastAPI, no auth, no database | FastAPI + SQLAlchemy/SQLite, custom JWT |
| Frontend | React 19, JavaScript, CSS modules, no router | React 18, TypeScript, shadcn/ui, Tailwind, react-router, react-query |
| Candidate value | Parsing, ATS score, recommendations, JD keyword match | Profile, CV upload + anonymization, job listings, applications, interviews, identity reveal |

The platform-level plan (Supabase Auth/Postgres/RLS/Storage, a shared `resume_engine`, FastAPI as the only backend) was set out in the earlier architecture audit. That plan still stands, and this document builds on it.

### 1.2 Work completed so far (Hire-geni stopgaps, verified by tests)

These ran against the current Hire-geni code before the platform migration:

- Authentication and ownership checks on ranking, shortlisting, bias-toggle, recommendations and CV detail.
- No PII leaks before an identity reveal, including through new-application notifications.
- Hardened uploads: generated storage names, type and signature checks, size limit.
- No guessable JWT secret.
- Institute-prestige bias removed from scoring.
- The anonymizer fails closed: without the NLP model it still redacts with regex instead of returning the raw text.
- One application per candidate per job, backed by a unique index and a safe migration.
- **AI no longer makes hiring decisions.**
  - Applications stay `applied` until a recruiter acts.
  - "Autopilot" now returns read-only suggestions.
  - Explanations say "Pending" unless a human has decided.
- Frontend type check is clean (0 errors).
- These fixes were verified by a 29-test suite at the time; all test files were removed from the repository on 2026-11-10 (project rule: no test files).

**Not yet started:** the platform foundation phases (repo consolidation, `resume_engine` extraction, Supabase schema/RLS, Supabase Auth). Section 9 explains why most candidate features should wait for them.

---

## 2. Existing feature audit (candidate side)

| Capability | Status | Evidence |
|---|---|---|
| Resume upload + validation | **Working (A); hardened (B)** | A: `Backend/app/validation/validator.py` (magic bytes, integrity, macros, image-only PDF). B: `Hire-geni/backend/main.py` `upload_cv` |
| Text extraction PDF/DOCX | **Working, duplicated** | A: PyPDF2 + pdfminer + docx2txt. B: pdfplumber + python-docx |
| Structured parsing | **Working (A, richer); basic (B)** | A: `parser/custom_parser.py` + enrichment in `services/analysis_service.py` (experience, education, projects, links). B: `agents/cv_processor.py` (skills, years, CGPA, project count) |
| LLM extraction | **Partially working** | A: Cerebras works; Gemini path broken (library not in requirements, no real fallback). B: Groq→Gemini router used only for explanations |
| ATS score (resume quality) | **Working, heuristic** | A: `ats/engine.py` — section/contact/experience/education/projects/skills/format sub-scores with explanations |
| Recommendations | **Basic** | A: `recommendation/engine.py` — field detection → static course list (`Courses.py`) |
| JD keyword match | **Defective** | A: `api.py` `/api/job-match` — loose substring matching, +10 bonus, inflated scores |
| Job-fit scoring vs posted jobs | **Working (rule-based)** | B: `agents/scoring.py` `score_for_job` (weighted required skills, experience, projects, certs) |
| Job recommendations | **Basic** | B: `agents/recommender.py` (Jaccard over skills) |
| Candidate profile | **Working** | B: `/profile/me`, `pages/seeker/SeekerProfile.tsx` (skills, experience, education, contact) |
| CV viewer / export | **Minimal** | B: `pages/seeker/GeneralizedCV.tsx` downloads plain `.txt` only |
| Resume builder / editor | **Missing** | — |
| Templates | **Missing** | — |
| PDF export | **Missing** | No PDF generation library in either app |
| Multiple resume versions | **Missing** | B stores multiple `CVRecord`s but no versioning, files or naming |
| Grammar / spelling | **Missing** | — |
| Weak verbs / repetition / quantification | **Partial** | A: ATS engine checks action verbs and numbers for scoring only; no line-level findings |
| AI rewriting (copilot) | **Missing** | — |
| Resume tailoring | **Missing** | — |
| Cover letters | **Missing** | — |
| Application tracker | **Partial** | B: tracks applications to *HireGenii* jobs only (status set by recruiter). No external jobs, notes, reminders or analytics |
| Interview tracking | **Partial** | B: `/interviews/my` lists scheduled interviews. No preparation features |
| Interview preparation | **Missing** | — |
| Persistence of analyses | **Missing (A)** | A keeps results in React context only (`frontend/src/context/ResumeContext.jsx`) |

**Design system (verified):** Hire-geni uses shadcn/ui, Tailwind, lucide icons, recharts, react-hook-form, zod and react-query. It ships **two** toast libraries (`sonner` and `react-toastify`); consolidate on `sonner`. The analyzer's screens (ATS audit, resume explorer, job matcher) are CSS-module JavaScript and will be ported, not reused as-is.

---

## 3. Enhancv benchmark: feature comparison

Priority: **P0** = core of the candidate product, **P1** = high value, **P2** = later.

| Feature | Enhancv (per brief) | HireGenii today | Required changes | Priority |
|---|---|---|---|---|
| Resume parsing | Import PDF/DOCX into editor | Parses to analysis JSON; no editor import | Map `CandidateProfile` → editable Resume Document; show parse-confidence warnings per section | **P0** |
| ATS scoring | ATS checker with categories | Heuristic ATS score + sub-scores (A) | Rebuild as the ATS Checker v2: line-level findings, parsing-quality score, category scores, the "what/why/how/suggestion" format | **P0** |
| Job matching | JD match + missing keywords | Defective keyword match (A); job-fit vs posted jobs (B) | JD parser (required vs preferred, skills, years, education); coverage and skills-match metrics; reuse B's weighted job-fit for internal jobs | **P0** |
| Resume builder | Live editor, drag/drop sections | Missing | Structured editor with live preview, section reorder, autosave, versions, duplicate | **P0** |
| Resume templates | Many designed templates | Missing | 3–4 ATS-safe templates at launch (single-column first), shared rendering for preview and PDF | **P0** |
| AI resume writing | Bullet rewrite, summary, achievements | Missing | Copilot with grounded suggestions, placeholders for metrics, accept/reject per suggestion | **P1** |
| Resume tailoring | One-click tailoring to JD | Missing | JD-driven suggestion set shown as a diff; never overwrites; creates a new version on accept | **P1** |
| Cover letter | Generator, tone, matching template, PDF | Missing | Grounded generator, tone options, editor, PDF export with the resume's template styles | **P1** |
| Job tracker | Statuses, linked resume, JD, analytics | Partial (internal applications only) | Tracker covering external and internal applications; notes, reminders, history, analytics | **P1** |
| Interview preparation | Questions from JD, STAR help | Missing | Question sets (technical/behavioral/HR/project-specific) with STAR answer scaffolds grounded in the resume | **P2** |
| Extras | LinkedIn import, translation, skills finder, headline/summary generators, examples, reports | Missing | See section 6.8; several items fold into the copilot | **P2** |

**Where HireGenii can do better than a resume builder alone:**

- One profile powers both job seeking *and* applying to recruiters on the same platform. Tailored resume versions can be submitted directly to HireGenii jobs.
- Transparent scoring: every check shows what it measured, and deterministic checks are labelled separately from AI suggestions.
- Privacy by design: anonymized applications and candidate-controlled identity reveal already exist.

---

## 4. Product principles (apply to every phase)

1. **Deterministic first.** Anything checkable by rules is checked by rules:
   - contact fields, section presence, length, dates, repetition, weak verbs, numbers, keyword coverage, file parseability.
   - LLMs are used only for language generation and judgement calls.
2. **Label the source.** Every finding carries `source: "rule" | "ai"`. The UI shows them in separate groups.
3. **No fabrication.**
   - AI output may only reference employers, titles, dates, degrees, certifications, skills and numbers that exist in the candidate's own data.
   - Missing metrics become placeholders, e.g. `[X%]` or `[number of users]`, which the user must fill.
   - A grounding validator (section 7.3) rejects output that violates this.
4. **Never overwrite.**
   - AI changes are suggestions with Original / Suggested / Reason / Accept / Reject.
   - Accepting a suggestion edits the document, and every save is a recoverable version.
5. **Honest scores.**
   - Scores are labelled "HireGenii ATS readiness (heuristic)".
   - We never claim to predict a specific third-party ATS.
   - ATS score (resume quality), job-match score (resume × JD) and recruiter ranking stay separate concepts.
6. **The candidate owns their data.** All candidate documents are private (row-level security, owner-only). Content is sent to an LLM provider only after the user has given consent once.

---

## 5. Architecture impact (proposed)

### 5.1 The Resume Document: one model for everything

Every candidate feature reads or writes one canonical structure. Parsing produces it, the builder edits it, templates render it, and the ATS checker, copilot, tailoring and cover-letter generator consume it.

```jsonc
// resume_documents.content (JSON, schema-versioned)
{
  "schema_version": "1.0",
  "basics": { "name": "", "headline": "", "email": "", "phone": "", "location": "", "links": [{ "label": "", "url": "" }] },
  "summary": { "id": "sum_1", "text": "" },
  "sections": [
    { "id": "sec_exp", "type": "experience", "title": "Experience", "visible": true,
      "items": [{ "id": "exp_1", "company": "", "title": "", "location": "", "start": "2021-03", "end": null,
                  "bullets": [{ "id": "b_1", "text": "" }], "skills": [] }] },
    { "id": "sec_edu", "type": "education", "items": [] },
    { "id": "sec_skills", "type": "skills", "groups": [{ "id": "g_1", "name": "Languages", "skills": ["Python"] }] },
    { "id": "sec_proj", "type": "projects", "items": [] },
    { "id": "sec_cert", "type": "certifications", "items": [] },
    { "id": "sec_ach", "type": "achievements", "items": [] },
    { "id": "sec_custom_1", "type": "custom", "title": "Volunteering", "items": [] }
  ],
  "layout": { "template_id": "classic", "font": "Inter", "font_size": 10.5, "line_height": 1.3,
              "margins_mm": 16, "section_spacing": 10, "accent_color": "#1F2937" }
}
```

- **Stable IDs** on every section, item and bullet. Diffs, suggestions and tailoring point at IDs, never at text positions.
- **`CandidateProfile` → Resume Document** is a pure mapping in `resume_engine`. The parser stays as it is.

### 5.2 Where each responsibility lives

| Concern | Location | Why |
|---|---|---|
| Resume CRUD, versions, tracker entries, cover-letter text, notes | **Supabase direct** (supabase-js + owner-only RLS) | Simple owner-only data; no Python needed |
| Import (parse PDF/DOCX → document) | **FastAPI** → `resume_engine.parsing` | Existing Python parsers |
| ATS check, JD parsing, job match | **FastAPI** → `resume_engine.checks`, `resume_engine.jd` | Rules + NLP in Python |
| Copilot, tailoring, cover letter, interview prep | **FastAPI** → `resume_engine.ai.*` via provider router | LLM orchestration, validation, quotas |
| PDF export | **Browser** (see 6.1) | $0, no server rendering cost, selectable text |
| Reminders (follow-ups, interviews) | **Postgres `pg_cron`** → notifications rows → Realtime | No extra infrastructure |
| Edge Functions | **None in this plan** | Nothing qualifies (no webhooks yet) |

### 5.3 `resume_engine` additions

These extend the package planned in the platform audit. Every module is pure Python with no FastAPI or database imports.

```text
resume_engine/
  document/      mapping.py (CandidateProfile <-> ResumeDocument), schema.py, plain_text.py (ATS text render)
  checks/        contact.py, sections.py, length.py, verbs.py, quantification.py, repetition.py,
                 spelling.py, dates.py, parse_quality.py, registry.py   # each check -> Finding[]
  jd/            parser.py (required/preferred/skills/years/education), keywords.py, coverage.py
  matching/      job_fit.py (shared with recruiter ranking), skills_match.py
  ai/            router.py (providers + fallback), prompts/ (versioned), schemas.py (Pydantic outputs),
                 grounding.py (fact validator), copilot.py, tailoring.py, cover_letter.py, interview.py
  evaluation/    fixtures/ (anonymized sample resumes + JDs), golden/ (expected outputs), runner.py
```

**`Finding` contract:**

```python
class Finding(BaseModel):
    id: str                      # stable check id, e.g. "verbs.weak_opening"
    source: Literal["rule", "ai"]
    severity: Literal["critical", "warning", "info"]
    category: str                # contact | summary | experience | skills | formatting | keywords | language ...
    target: TargetRef | None     # section/item/bullet id in the Resume Document
    what: str                    # what is wrong
    why: str                     # why it matters
    how: str                     # how to fix it
    suggestion: str | None       # concrete improved text (placeholders allowed, never invented facts)
```

### 5.4 Background processing

- **Fast operations run synchronously** (under ~2 seconds): rule checks, JD parsing, job match.
- **Slow operations become jobs:** import parsing, LLM generation and full reports.
  - An `ai_jobs` table holds `id, user_id, kind, status, input_ref, result, error, created_at`.
  - FastAPI runs the work in-process for the beta.
  - The UI follows progress through Supabase Realtime on that row. No paid queue is needed.
- **Caching:** results are keyed by `(document_version_hash, jd_hash, engine_version, prompt_version)`.
  - Re-running an ATS check on an unchanged document is a lookup.
  - LLM results are never cached across users.

---

## 6. Feature specifications

Each feature has an MVP scope (ships in its phase) and a Later scope.

### 6.1 A. Resume Builder (P0)

**MVP**
- Structured form editor with a live preview side by side (stacked with a toggle on mobile).
- Edit basics, summary, experience, education, skills, projects, certifications, achievements, and custom sections.
- Add, remove, hide and reorder sections and items. Drag and drop has keyboard-accessible alternatives (move up/down buttons).
- Layout controls: template, font (from an ATS-safe list), font size, line height, margins, section spacing, accent colour.
- Autosave: a debounced save about 1.5 s after typing stops, with a "Saved/Saving/Offline" indicator. A version snapshot is taken on explicit "Save version", on AI-accept, and on import.
- Multiple resumes per user: create, rename, duplicate, delete (soft delete) and set primary.
- Import PDF/DOCX into a new document. Low-confidence fields are highlighted for review.
- PDF export with selectable text. Plain-text export (the ATS view) is kept from the current CV viewer.

**Templates at launch (decided):** three single-column, ATS-safe templates: Classic, Modern (with accent colour) and Compact (dense).

**PDF engine (decided): `@react-pdf/renderer`.**
- One component tree renders both the live preview and the exported PDF, so they can't drift apart.
- Text is real and selectable, fonts are embedded, and it runs in the browser at $0.
- It's lazy-loaded (about 500 KB) so other pages don't pay for it.
- Each template is a react-pdf component that receives the Resume Document and its `layout` settings.

**Later**
- Rich-text formatting inside bullets.
- A two-column template labelled "less ATS-safe".
- A version diff viewer.

**Photos (decided: optional, non-ATS templates only)**
- Photos ship with the first non-ATS template.
- Off by default. Stored in the private `resumes` bucket under the owner's folder; JPEG/PNG only, re-encoded server-side to strip metadata, size-capped.
- ATS-safe templates never render a photo, and the ATS checker flags one as a parsing risk.
- **Privacy rule:** when a resume version is attached to a HireGenii application, the photo is excluded from the snapshot until the candidate approves identity reveal. This keeps anonymized screening intact.

**Acceptance criteria**
- Exported PDF text can be extracted by our own parser with at least 95% field recovery on fixtures. This is a round-trip test.
- No data is lost on refresh or offline edit.
- Reordering works by keyboard.
- Template switching never loses content.

### 6.2 B. ATS Checker v2 + job matching (P0)

**Deterministic checks (`source: rule`)**

| Category | Checks |
|---|---|
| Parsing quality | Text extractable, reading-order sanity, section headers recognised, tables/columns/images detected, contact found in body (not header/footer) |
| Contact | Name, email, phone, location, LinkedIn/portfolio; email/phone format |
| Summary | Present, length range, first-person overuse, buzzword density |
| Experience | Dates present and consistent, reverse chronology, gaps over N months flagged (informational), bullets per role, bullet length |
| Language | Weak or repeated opening verbs, repeated words across bullets, passive voice heuristics, spelling (dictionary + tech-term allowlist) |
| Quantification | Share of bullets containing measurable results |
| Length & formatting | Page estimate vs experience level, consistent date formats, consistent tense |
| Sections | Completeness against role type |
| Skills | Normalized through the shared skill taxonomy; hard vs soft split |

**Grammar and spelling (decided): LanguageTool API at launch, with offline fallback.**
- **Provider:** grammar and spelling come from LanguageTool's HTTP API, wrapped as a provider in `resume_engine/checks/language/` so it can be swapped out. Self-hosting needs Java and 1–2 GB of RAM, which doesn't fit free hosting.
- **Consent:** it runs only for users who gave the one-time external-processing consent (decision 6). Without consent, the offline fallback is used.
- **Free-tier limits:** the public API is rate-limited per IP and per request size. Exact limits must be re-checked at implementation time. Because every request comes from our server's IP, all users share one limit, so:
  - only the resume's prose is sent (bullets and summary, not contact details), in batches within the size limit;
  - results are cached by `(text_hash, language)`, so an unchanged bullet is never re-sent;
  - on rate limit, timeout or outage the check falls back to `pyspellchecker`. That is offline and $0, but spelling only. The report says "Grammar check unavailable — spelling only".
- **Tech terms:** an allowlist from the skills taxonomy (e.g. "Kubernetes", "FastAPI") keeps them from being flagged as misspellings.
- **Labelling:** findings are tagged `source: rule`, because they're deterministic and not LLM output, with `provider: languagetool | offline`.
- **Upgrade path:** a paid LanguageTool plan or a self-hosted server later only changes configuration.

**With a job description**
- **JD parser:**
  - Required vs preferred qualifications, found by section-header and modal-verb cues ("must", "required", "nice to have", "preferred").
  - Hard skills (taxonomy match), years of experience, education, certifications.
  - An optional LLM pass for messy JDs, validated against the JD text.
- **Metrics:**
  - keyword coverage % (weighted: required counts double);
  - skills match %;
  - experience relevance (years plus title/skill overlap per role);
  - missing qualifications list.
- **Reuse** `scoring.score_for_job` logic so candidates and recruiters see consistent job-fit numbers for internal jobs.

**Display**
- Overall ATS readiness, job match, keyword match %, skills match %, parsing quality.
- Category scores, critical issues first.
- Every finding in the What / Why / How / Suggestion format.
- Findings link to the exact bullet in the editor.

**Acceptance criteria**
- Each check has unit tests with positive and negative fixtures.
- JD parser precision/recall is measured on at least 20 labelled JDs (section 7.4).
- The score methodology page is reachable from every score.

### 6.3 C. AI Resume Copilot (P1)

**Actions:** rewrite bullet, achievement-focus a responsibility, improve summary, generate headline, suggest skills (only those evidenced in the resume), improve readability, de-duplicate, suggest industry terminology.

**Grounding rules, enforced in code and not only in prompts:**
- **Input:** only the target text plus the minimal context (role, company, other bullets of that role, the skills list).
- **Output:** Pydantic schema `{suggestions: [{target_id, original, suggested, reason, placeholders[]}]}`.
- **Validator (section 7.3):** rejects any new number, employer, title, degree, certification or skill not present in the source. A rejected suggestion is retried once with feedback, then dropped. It is never shown unvalidated.

**UX:** suggestions appear inline with Accept / Edit / Reject. Accepting writes to the document, records a version, and the original text stays recoverable.

**Later:** a "Strengthen whole section" batch mode and a tone control.

### 6.4 D. Job-specific tailoring (P1)

**Flow**
1. Paste or upload a JD.
2. Parse it (6.2).
3. Score the relevance of each section, item and bullet.
4. Produce a suggestion set:
   - summary rewrite;
   - bullet rewrites for relevant roles;
   - reorder proposals (relevant items first, within each section, keeping reverse-chronological order where expected);
   - keyword suggestions *only when evidence exists elsewhere in the resume*. For example, "Docker" appearing in a project gets surfaced into the skills list.
5. Show a diff view: Original | Suggested | Reason | Accept / Reject, plus "Accept all safe changes".
6. Accepting creates a **new resume version** named after the job. The source document is untouched.

**Unsupported JD skills:** listed under "Skills this job asks for that your resume doesn't show". They are never inserted.

### 6.5 E. Cover letter generator (P1)

- **Inputs:** a resume version, the JD, company name, job title, a tone (professional, enthusiastic, concise), and optional user notes ("why this company").
- **Output:** 3–4 paragraphs. A check flags any sentence with high n-gram overlap with resume bullets, so the letter doesn't copy the resume word for word.
- **Editor:** regenerate a single paragraph, save, and export to PDF using the resume's template styles. It is linked to tracker entries.
- **Grounding:**
  - same validator as the copilot;
  - company facts come only from the JD or the user's notes;
  - nothing claims research we didn't do.

### 6.6 F. Application tracker (P1, no AI, can ship early)

- **Entries:** company, job title, job URL, JD text, location, salary (optional), applied date, status, linked resume version, linked cover letter, contacts, notes, follow-up date, interview dates.
- **Statuses (decided):** Saved → Applied → Screening → Interview → Offer, plus two end states.
  - **Rejected** means the employer declined.
  - **Withdrawn** means the candidate pulled out.
  - Every change writes an event, giving a history timeline.
  - For internal HireGenii applications, the recruiter-set platform status maps onto these. A candidate withdrawing from a HireGenii application also withdraws the platform application.
- **Internal HireGenii applications** appear in the same board, read-only for status (set by the recruiter), and linked automatically.
- **Views:** board (kanban), table, calendar of follow-ups and interviews.
- **Reminders:** a `pg_cron` daily job creates notifications for due follow-ups.
- **Analytics:** applications per week, funnel conversion by stage, response rate, median time to first response, outcomes by resume version. Charts only where they answer a question.

### 6.7 G. Interview preparation (P2)

- **Inputs:** resume version + JD (+ optional company notes).
- **Output sets:**
  - technical questions from JD skills and the candidate's own stack;
  - behavioral and HR questions;
  - project deep-dives that reference the candidate's actual projects;
  - questions to ask the interviewer.
- **STAR scaffolds:** Situation/Task/Action/Result drafted *from the candidate's own bullets*, with placeholders where details are missing.
- **Disclaimer:** "Likely topics based on the job description — not the interviewer's actual questions."
- **Company research:** limited to information from the JD and the user's notes, plus a checklist of what to research themselves. There's no web browsing, because no free compliant source exists. A paid search API is an option for later and needs a cost review.
- **Export:** prep report as PDF.

### 6.8 H. Additional features: evaluation

| Feature | Recommendation | Reason / cost |
|---|---|---|
| LinkedIn import | **Do it via the user's "Save to PDF" profile export** → existing importer | LinkedIn offers no profile-import API for this use; scraping breaks its terms. $0 |
| Resume translation | P2, LLM-based, output as a new version, with a user review warning | Uses free-tier LLM quota |
| AI skills finder | Fold into copilot "suggest skills" (evidence-only) | No new system |
| Headline / summary generator | Fold into copilot | No new system |
| Examples & guidance | P2 static content (MDX pages) written by us | Must not copy Enhancv's examples |
| Multiple versions | Part of the builder MVP | — |
| Downloadable reports | ATS report + interview prep PDF using the same renderer | $0 |

---

## 7. AI reliability and evaluation

### 7.1 Provider layer

- **One router** for all providers, through OpenAI-compatible clients where possible.
  - **Default order (decided):** Groq → Gemini → Cerebras.
  - The order is configured (`AI_PROVIDER_ORDER`), not hardcoded. A provider with no API key configured is skipped.
- **Per-call settings:** timeout (hard, 20 s), up to 2 retries with backoff for retryable errors, and moving to the next provider on rate limits or outages.
- **When every provider fails:** a typed `ProviderUnavailable` error. Features show "AI unavailable — rule-based results still shown". Nothing fails silently.
- **Consent gate (decided):** no AI call is made for a user without the one-time external-processing consent. The API refuses with a clear error code, and the UI shows the consent prompt.
- **Quota (decided):** 30 AI actions per user per day in beta, configured as `AI_DAILY_ACTIONS`.
  - An "action" is one user-initiated generation, such as a copilot rewrite, a tailoring run, a cover letter or a prep set. Internal retries and fallbacks don't count.
  - The quota is checked before calling, using `ai_usage_events`, and the remaining count is shown in the UI.
  - Rule-based checks never count against it.
- **Usage logging:** every provider call writes `ai_usage_events` (provider, model, tokens, latency, success).

### 7.2 Prompts and schemas

- **Prompts live in `resume_engine/ai/prompts/<feature>/v<N>.md`**, and each prompt has an ID and version. The version is stored with every result so results can be reproduced and compared.
- **Every generation:**
  1. asks for JSON matching a Pydantic schema;
  2. is parsed and schema-validated;
  3. on failure, gets one repair retry;
  4. then fails cleanly.

### 7.3 Grounding validator (code, deterministic)

Before any AI suggestion reaches the user, it is checked against the source document:

- **Numbers:** every number or percentage in the output must appear in the source, or be a placeholder in `[brackets]`.
- **Entities:** employers, job titles, degrees, institutions and certifications must appear in the source document. Comparison uses normalized, fuzzy-tolerant matching.
- **Skills:** every skill named must already be in the document (skills section or any bullet), except in the explicit "missing from your resume" list.
- **Dates:** no new dates.
- **What happens on a violation:** the validator drops or retries the suggestion and logs the reason for evaluation.

### 7.4 Evaluation set

- **Fixtures:** 20–30 anonymized resumes covering:
  - fresher, mid-level and senior candidates;
  - tech and non-tech roles;
  - single- and two-column layouts, DOCX and scanned PDFs (negative cases);
  - plus 20 JDs with hand-labelled required and preferred skills.
- **Automated metrics, run in CI:**
  - parse field recovery;
  - JD skill extraction precision and recall;
  - check-level unit tests;
  - grounding-violation rate on recorded LLM outputs (replayed, so CI needs no live API).
- **Manual review:** a rubric (accuracy, helpfulness, no fabrication) for each new prompt version on 10 fixtures before release.

---

## 8. Data model changes (proposed, Supabase)

All tables are owner-only under RLS (`user_id = auth.uid()`) unless noted. These extend the unified schema from the platform audit; they don't replace it.

| Table | Key columns | Notes |
|---|---|---|
| `resume_documents` | `id, user_id, title, content jsonb, schema_version, is_primary, source (import/blank/duplicate/tailored), source_resume_id, target_job_ref, deleted_at, updated_at` | The live editable document; autosave target |
| `resume_document_versions` | `id, resume_id, user_id, content jsonb, content_hash, label, reason (manual/ai_accept/import/tailor), created_at` | Immutable snapshots; restore = copy into the document |
| `resume_files` | `id, user_id, resume_id null, storage_path, mime, size, sha256` | Uploaded originals in the private `resumes` bucket |
| `job_descriptions` | `id, user_id, company, title, url, raw_text, parsed jsonb, parser_version, text_hash` | Reused by checker, tailoring, cover letter, tracker, prep |
| `ats_reports` | `id, user_id, resume_version_id, job_description_id null, scores jsonb, findings jsonb, engine_version, created_at` | Report history |
| `ai_suggestion_sets` | `id, user_id, resume_id, kind (copilot/tailoring), job_description_id null, prompt_version, provider, status, created_at` | Groups suggestions |
| `ai_suggestions` | `id, set_id, target_id, original, suggested, reason, placeholders jsonb, decision (pending/accepted/rejected/edited), decided_at` | Accept/reject audit trail |
| `cover_letters` | `id, user_id, resume_version_id, job_description_id, tone, content jsonb, prompt_version, updated_at` | Editable after generation |
| `tracked_applications` | `id, user_id, job_description_id, company, title, url, status, applied_at, resume_version_id, cover_letter_id, platform_application_id null, follow_up_at, notes, salary` | `platform_application_id` links internal applications (status read-only from there) |
| `tracked_application_events` | `id, tracked_application_id, user_id, from_status, to_status, note, at` | History + analytics |
| `tracked_interviews` | `id, tracked_application_id, user_id, scheduled_at, kind, notes` | Separate from recruiter-created `interviews` |
| `interview_prep_sets` | `id, user_id, resume_version_id, job_description_id, content jsonb, prompt_version` | Saved prep reports |
| `ai_jobs` | `id, user_id, kind, status, input jsonb, result jsonb, error, created_at, finished_at` | Background work + Realtime progress |

**Rules**
- Writes to `ats_reports`, `ai_suggestion*`, `ai_jobs` and `interview_prep_sets` come from FastAPI.
- Users can read their own rows and update `ai_suggestions.decision`.
- No recruiter can read any of these tables. When a candidate applies to a HireGenii job with a resume version, a **snapshot** is attached to the application (platform design), never a live link to the editor.

**Migrations:**
- Additive only, as SQL files under `supabase/migrations/`.
- Each one has RLS tests (owner, other user, anonymous user, recruiter).

**Existing data:** none is migrated. The platform starts fresh (decision P2).

**Platform tables touched by the decisions:**
- `organizations.status` (`pending | approved | rejected | suspended`, default `pending`), changed only by platform admins (P5).
- `profiles.is_platform_admin`, not writable by the `authenticated` role (P6).

---

## 9. Roadmap

### 9.1 Why the foundation comes first

Building the editor, tracker or copilot on the current SQLite + custom-JWT backend would mean building them twice. Every feature here needs:

- real user identity (Supabase Auth);
- owner-only storage (RLS + Storage);
- the shared parsing and scoring code (`resume_engine`).

So the brief's phases are sequenced *after* the platform foundation.

### 9.2 Phases

| Phase | Brief phase | Objective | Main work | Exit criteria |
|---|---|---|---|---|
| **F1** Repo & tooling | — | One repo layout and CI | `frontend/` (from Hire-geni frontend, analyzer screens ported), `backend/` (one FastAPI app), `supabase/`; CI runs typecheck, lint, unit tests, build | **Layout done 2026-11-10** (see README); CI not yet set up |
| **F2** `resume_engine` | — | Shared Python core | Merge parsers, ATS engine, skills taxonomy, job-fit; `document/` mapping; evaluation fixtures | Golden tests pass; no FastAPI/DB imports |
| **F3** Supabase schema | 2 | Data + security | Platform tables + candidate tables (section 8), RLS, Storage bucket, `pg_cron` | RLS tests pass for every actor |
| **F4** Auth cutover | — | Supabase Auth everywhere | Frontend auth, FastAPI JWT verification (JWKS) | Old auth removed; negative JWT tests pass |
| **C1** Resume Builder | 3 | P0 builder | Editor, templates, autosave, versions, import, PDF export | Section 6.1 acceptance |
| **C2** ATS Checker v2 | 4 | P0 checker + JD match | `checks/`, `jd/`, report UI linked to editor, methodology page | Section 6.2 acceptance; eval metrics recorded |
| **C3** Application tracker | 7 (moved earlier) | P1, no AI | Tracker tables/UI, reminders, analytics, internal-application linking | Status history correct; reminders fire |
| **C4** AI Copilot | 5 | P1 | Provider router, prompts, grounding validator, suggestion UI | Grounding-violation rate 0 on replay set |
| **C5** Tailoring | 5 | P1 | JD-driven suggestion sets, diff view, version-on-accept | Original never modified; tests prove it |
| **C6** Cover letters | 6 | P1 | Generator, editor, PDF, tracker link | Overlap check + grounding pass |
| **C7** Interview prep | 8 | P2 | Question sets, STAR scaffolds, report PDF | Disclaimers present; grounding pass |
| **C8** Polish & hardening | 9 | Quality | Accessibility pass (WCAG AA), responsive review, performance, rate limits, docs | Lighthouse a11y ≥ 95 on key pages; E2E suite green |

**Why the tracker moves to C3:** it needs no AI, has high user value and low risk, and gives early real usage data. It is independent of C4–C7.

**Parallel work:** C2 and C3 can run in parallel after C1. C6 and C7 can run in parallel after C4.

**Current gate (decision P1):** database work is deferred.
- **F1 (repo & tooling) and F2 (`resume_engine`) don't need the database and can start now.** F2 also removes the institute-bias code (P3).
- F3, F4 and every candidate phase wait until database work begins.

### 9.3 Definition of done (every phase)

- Backend unit and API tests, plus RLS tests for new tables, pass in CI.
- Frontend typecheck, lint (on touched files), Vitest and build all pass. Playwright E2E covers the phase's happy path.
- Existing recruiter flows are re-tested with an E2E smoke run: post job, review applicant, reveal, interview.
- API docs (FastAPI OpenAPI) and this document's status table are updated.
- No feature is called complete without the tests above passing.

---

## 10. Cost and dependency review ($0 constraint)

| Need | Choice | Cost | Notes |
|---|---|---|---|
| LLM | Groq / Gemini / Cerebras free tiers behind the router | $0 within limits | Limits change; per-user quotas protect us; rule-based results always work |
| PDF | `@react-pdf/renderer` (decided) | $0 | New frontend dependency, lazy-loaded |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` (proposed) | $0 | Accessible, small; nothing equivalent installed |
| Grammar + spelling | LanguageTool public API (decided, launch) | $0 with shared rate limits | Sends prose to a third party, so consent-gated; cached; limits to re-verify at implementation |
| Spelling fallback | `pyspellchecker` (decided) | $0 | Pure Python, offline; used without consent or when LanguageTool is unavailable |
| Reminders | Supabase `pg_cron` | $0 | — |
| Company research | None automated | — | A paid search API would need a separate cost review |
| LinkedIn | PDF export import | $0 | No API or scraping |
| Hosting | As in the platform audit (static frontend host, Supabase free, FastAPI on a free tier) | $0 | Cold starts expected; free terms to be re-verified |

Already present and reusable: zod, react-hook-form, recharts, react-query, date-fns, shadcn/ui. Consolidate the two toast libraries onto `sonner`.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| AI fabricates experience or metrics | Deterministic grounding validator, placeholders, accept/reject, replay tests |
| Users treat our score as a real ATS verdict | "Heuristic" labelling, methodology page, no "guaranteed" language |
| Editor complexity / data loss | Stable-ID document model, autosave + versions, offline-safe save queue, round-trip tests |
| Free-tier LLM limits hit during beta | Quotas, caching by content hash, rule-only fallback |
| PDF preview vs export drift | Single renderer for both (react-pdf option) |
| Scope creep from benchmark parity | MVP/Later split per feature; P2 items gated on usage |
| Copying a competitor | Implement capabilities only; original templates, copy and examples |
| Candidate privacy | Owner-only RLS, LLM consent, no candidate data in logs, snapshots (not live docs) shared with recruiters |

---

## 12. Decisions (approved 2026-11-10)

| # | Decision | Outcome | Consequence |
|---|---|---|---|
| 1 | Sequencing | **Foundation first:** F1–F4 before C1 | No candidate feature is built on the SQLite backend |
| 2 | PDF engine | **`@react-pdf/renderer`** | One renderer for preview and export; lazy-loaded |
| 3 | Frontend base | **Hire-geni TypeScript + shadcn app** | Analyzer screens are ported into it (also settles platform-audit decision 1) |
| 4 | Tracker statuses | **Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn** | "Rejected" always means the employer declined |
| 5 | Grammar | **Grammar and spelling at launch through the LanguageTool API**, with offline spelling (`pyspellchecker`) as fallback | Third-party processing, so it's covered by the consent in #6; shared rate limits need caching and graceful fallback (section 6.2) |
| 6 | Consent | **One-time opt-in** before any resume content goes to an external service (AI providers *and* LanguageTool); revocable in settings | Rule-based checks work without consent |
| 7 | AI providers | **Groq → Gemini → Cerebras** | Order lives in configuration, not code |
| 8 | AI quota | **30 AI actions per user per day** in beta | Rule-based checks are unlimited; the quota is configurable |
| 9 | Templates at launch | **3 single-column ATS-safe templates** (Classic, Modern, Compact) | Two-column and photo templates come later |
| 10 | Photos | **Optional, only in non-ATS templates, off by default** | Photos ship with the first non-ATS template (after launch). Photos are always hidden from recruiters until identity reveal (section 6.1) |
| 11 | Tracker order | **Tracker moves to C3**, alongside the ATS checker | Ships before any AI feature |

### 12.1 Platform decisions (approved 2026-11-10)

| # | Decision | Outcome | Consequence |
|---|---|---|---|
| P1 | Supabase / database work | **Deferred.** Database work starts later; the live project is not inspected yet | F3 (schema) and F4 (auth) wait. Before F3 starts, the existing project's schema is reviewed (dump or read access) |
| P2 | Existing Hire-geni data | **Start fresh:** no migration of SQLite users, CVs or applications | No migration script. Demo and test accounts are recreated. `CVRecord` → `resume_documents` mapping is dropped from scope |
| P3 | Institute-bias demo | **Delete** | Remove the `/bias-toggle` endpoint and its CandidateDetail usage, the institute-prestige path in scoring (`_institute_bias_adjustment`, `include_institute_bias`), `data/*.pkl`, the bias dataset and `/bias-report`. Done during F2 so nothing biased enters `resume_engine` |
| P4 | Resume PDFs in git history | **The owner handles removal on GitHub.** No history rewrite or push from this project | Personal files stay out of the repo through `.gitignore` (already covers the upload folders); keep checking that no CVs get committed |
| P5 | Recruiter onboarding | **Admin approval** | `organizations.status`: `pending` → `approved` / `rejected` / `suspended`. Only platform admins change it. RLS blocks publishing jobs, and recruiter access to applicants, unless the org is `approved`. Admins get a pending-org queue |
| P6 | Platform admins | **Database flag set manually** | `profiles.is_platform_admin`, changeable only through SQL by the project owner. There's no UI or API to grant it, the column isn't writable by the `authenticated` role, and changes are audit-logged by a trigger |

---

## 13. Document status

| Section | State |
|---|---|
| Existing feature audit | Complete (verified against source) |
| Enhancv comparison | Complete (Enhancv capabilities per brief, not independently verified) |
| Decisions | 11 approved (section 12); platform-audit items still open are listed there |
| Architecture and data impact | Updated for the approved decisions |
| Roadmap | Approved order: F1 → F2 → F3 → F4 → C1 → (C2 ∥ C3) → C4 → C5 → (C6 ∥ C7) → C8. **F1 and F2 can start now; F3 onward waits for database work to begin (P1)** |
| Platform decisions | 6 approved (section 12.1); none open |
| Implementation | Not started |
