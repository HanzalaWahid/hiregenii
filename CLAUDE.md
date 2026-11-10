# Claude Code Project Instructions

## 1. Project-wide operating rules

These instructions apply to every task in this repository. Follow them before inspecting, changing, or implementing anything.

### Approval before changes
- **Do not modify, add, remove, rename, move, or refactor project files without first explaining the proposed change and receiving explicit approval.**
- Before changing an existing feature, endpoint, UI flow, database object, schema, configuration, dependency, or business rule, describe:
  1. What is changing.
  2. Why the change is necessary.
  3. Which files and components will be affected.
  4. Whether existing behavior or data could be affected.
  5. How the change will be verified.
- Wait for approval. A request to inspect, analyze, or explain is **not** approval to implement.
- Do not bundle unrelated improvements into an approved task. Approval for one change does not authorize additional changes.
- If implementation reveals a need for a different or broader change, stop and ask again.

### Verify before implementation
- Start every task by inspecting the relevant source code, configuration, routes, components, database definitions, and documentation.
- Trace the complete existing flow before editing it: frontend entry point → API/client call → backend route/service → database/storage → response/UI behavior, as applicable.
- Verify whether the requested functionality already exists. Do not duplicate, replace, or rebuild working functionality without evidence and approval.
- Check actual repository state and current conventions. Do not rely on assumptions, old summaries, generated plans, or filenames alone.
- Identify dependencies, callers, data contracts, authorization checks, and side effects before proposing a change.
- Report uncertainty and missing information. Never present an unverified assumption as a fact.
- Do not begin implementation until the findings and proposed implementation have been presented and approved.

## 2. Product requirements are the source of truth

- Locate and read the project's **PRD (Product Requirements Document)** and **ERD (Entity Relationship Diagram/document)** before making product or business-logic decisions.
- Treat the PRD as the primary source for product scope, user roles, workflows, feature behavior, acceptance criteria, and business rules.
- Treat the ERD as the source for entities, relationships, ownership, constraints, and data structure.
- Follow the documented business logic. Do not invent, simplify, remove, reinterpret, or silently change business rules.
- Do not infer a business rule from the current implementation if it conflicts with the PRD or ERD. Report the discrepancy and ask how it should be resolved.
- If the PRD and ERD conflict with each other, or either is missing/incomplete, stop and report the exact conflict or gap. Ask for clarification before implementing affected behavior.
- If the code conflicts with the PRD/ERD, document:
  - the relevant requirement or ERD relationship;
  - the current code behavior and exact source location;
  - the proposed correction and its impact.
  Wait for approval before changing it.
- Do not create a new business rule merely to make implementation easier.
- Keep a clear distinction between documented requirements, current implementation behavior, and proposed decisions.

## 3. Preserve existing working functionality

- The objective is to evolve the existing product, not to rewrite it unnecessarily.
- Preserve all verified working features, workflows, API contracts, UI behavior, data, and integrations unless a specific approved requirement says otherwise.
- Before changing a feature, identify its current behavior and all known dependencies.
- Prefer the smallest safe change that satisfies the approved requirement.
- Do not perform opportunistic refactoring, formatting sweeps, renaming, dependency upgrades, framework migrations, or architectural redesign as part of an unrelated task.
- Do not remove old code or compatibility paths until their usage has been checked and removal is explicitly approved.
- Do not replace a working implementation just because another approach is more fashionable or theoretically cleaner.
- If a requested change may break an existing workflow, explain the risk and propose a compatibility-preserving approach.

## 4. Test-file restriction and verification

- **Do not create test files.** This includes unit tests, integration tests, end-to-end tests, fixtures, test utilities, snapshots, and test directories.
- Do not add test frameworks or testing dependencies.
- Do not create test files as a workaround for this instruction.
- You may run existing tests or existing verification commands when available and relevant, but do not modify them without explicit approval.
- Verify changes using existing project commands, static checks, type checks, linting, manual execution, API inspection, or other already available project facilities.
- If no suitable verification mechanism exists, state that clearly. Do not create a test file.
- Never claim that something passed verification unless you actually ran the relevant command or checked the behavior.
- Report exactly what was verified, what was not verified, and any remaining risk.

## 5. Minimize token and tool usage

- Be economical with Claude Code context, tokens, tool calls, and output.
- Do not repeatedly print entire files, directory trees, logs, or documentation.
- Use targeted searches and inspect only relevant file sections. Expand inspection only when dependencies require it.
- Do not reread files already inspected unless they may have changed or the relevant context is no longer available.
- Avoid long speculative explanations, duplicate summaries, and unnecessary planning documents.
- Do not run broad scans, repeated searches, or expensive commands without a clear reason.
- Do not generate large code dumps in the conversation. Summarize findings and show only relevant snippets or diffs.
- Keep progress updates concise and report meaningful findings rather than narrating every tool call.
- Token efficiency must **never** come at the cost of skipping required verification, missing relevant business rules, or making unsafe assumptions.

## 6. Database, Supabase, and security constraints

- Use the existing Supabase project as the managed data platform. Do not provision or introduce a separately managed PostgreSQL server.
- Remember that Supabase Database is PostgreSQL underneath; do not describe it as a separate database migration target.
- Do not assume the live Supabase schema matches local code or environment-variable names. Verify the actual available schema and project configuration using safe, read-only inspection.
- Never print, expose, commit, or request secrets such as Supabase secret/service-role keys, JWT secrets, or provider API keys. Do not put secrets in frontend code.
- Treat Supabase Row Level Security (RLS) as a core authorization boundary. Do not bypass it casually.
- A Supabase service-role/secret key bypasses RLS. Use it only for a specifically approved, narrowly scoped server-side operation; never expose it to the browser.
- Do not make destructive database changes, reset projects, drop tables, truncate data, rewrite migrations, or alter production data without explicit approval and a backup/rollback plan.
- Prefer additive, reversible schema changes where possible. Explain migration and data-impact risks before requesting approval.
- Do not assume that local SQLite data, uploaded files, or existing user accounts can be discarded or migrated without a decision.

## 7. Current target architecture

Use this as the approved architectural direction unless the user explicitly changes it:

- **One modular FastAPI backend** for Python resume processing, ATS analysis, AI/LLM integrations, matching, ranking, and complex business logic.
- **Supabase** for Auth, managed database, RLS, Storage, and Realtime.
- **Hire-geni React + TypeScript frontend** as the likely unified frontend base; integrate the AI Resume Analyzer experience into it without losing working functionality.
- Extract shared Python resume-analysis functionality into a reusable module only after inspecting dependencies and receiving approval for the extraction.
- Use Supabase Edge Functions only when a concrete lightweight integration, webhook, or scheduled-task requirement justifies them. Do not introduce them by default.
- Avoid unnecessary microservices and avoid rewriting working Python AI logic in TypeScript.
- Keep candidate/resume analysis, job-fit matching, and recruiter ranking as distinct concepts unless the PRD explicitly defines otherwise.
- Do not allow AI-generated scores or recommendations to silently make final recruiter decisions. Follow the PRD's decision workflow; if it is unclear, ask.

This section records the target direction, not permission to implement or restructure the repository.

## 8. Security and sensitive data

- Treat resumes, candidate profiles, contact details, recruiter data, credentials, and uploaded documents as sensitive.
- Verify authentication, authorization, tenant/organization ownership, and resource ownership for every relevant operation.
- Never trust a user-supplied candidate ID, resume ID, job ID, organization ID, file path, or role without validating access.
- Use private storage for sensitive resumes unless the approved requirements explicitly state otherwise.
- Do not weaken validation, authorization, anonymization, or RLS to make a feature work.
- Fail closed for privacy-sensitive behavior. If anonymization or access checks fail, do not return unredacted data.
- Avoid logging PII, resume contents, tokens, secrets, or full request bodies.
- Report security defects immediately. Do not silently make broad security changes without approval, except where the user has explicitly authorized that exact remediation.

## 9. Required workflow for every task

Follow these steps in order:

1. **Understand** — Restate the requested outcome briefly. Identify whether the task is analysis, implementation, debugging, or documentation.
2. **Inspect** — Read the relevant code and the applicable PRD/ERD sections. Trace existing behavior and dependencies.
3. **Verify current state** — Determine what already works, what is broken, and what is missing. Use evidence from source code or actual execution.
4. **Compare requirements** — Check the requested behavior against the PRD and ERD. Identify conflicts or gaps.
5. **Propose** — Present a concise plan, exact affected files/components, risks, and verification approach.
6. **Wait for approval** — Do not edit files until the user explicitly approves the proposed changes.
7. **Implement narrowly** — Make only the approved changes. Preserve unrelated functionality and avoid test-file creation.
8. **Verify** — Run appropriate existing checks or perform documented manual verification. Do not claim unperformed checks.
9. **Report** — Summarize changed files, behavior changed, verification performed, limitations, and any follow-up decision needed.

For an analysis-only request, complete steps 1–5 and stop. Do not edit files.

## 10. Final response format

Keep reports concise and evidence-based. For implementation tasks, include:

- **Verified current behavior**
- **PRD/ERD alignment**
- **Proposed or completed changes**
- **Files affected**
- **Verification performed**
- **Not verified / remaining risks**
- **Approval needed**, if another change is required

Always distinguish between:
- verified facts;
- requirements explicitly stated in the PRD/ERD;
- assumptions or inferences;
- recommendations awaiting approval.

Do not say “complete,” “fixed,” or “working” unless the relevant behavior has actually been verified.
