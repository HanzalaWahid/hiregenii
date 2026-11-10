# supabase/

Placeholder for the Supabase project files. **Nothing here is in use yet.**

Database work is deferred (decision P1 in `docs/hiregenii/CANDIDATE_PLATFORM_PLAN.md`). The backend still uses a local SQLite file (`backend/data/app.db`).

| Folder | Purpose (when database work starts) |
|---|---|
| `migrations/` | SQL migrations: schema, Row Level Security policies, storage policies. Additive and reviewed |
| `functions/` | Edge Functions, only for a justified webhook or scheduled task (none planned yet) |

Before the first migration, the existing Supabase project's schema will be reviewed (read-only), so these migrations build on what is already there. Secrets never go in this folder.
