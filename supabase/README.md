# supabase/

Placeholder for the Supabase project files. **Nothing here is in use yet.**

Supabase is a target direction, not an active application integration. The backend still uses local SQLite (`backend/data/app.db`). See [DATABASE.md](../docs/DATABASE.md) for current persistence and unresolved schema decisions.

| Folder | Purpose (when database work starts) |
|---|---|
| `migrations/` | SQL migrations: schema, Row Level Security policies, storage policies. Additive and reviewed |
| `functions/` | Edge Functions, only for a justified webhook or scheduled task (none planned yet) |

No live project schema has been verified. Review the existing project read-only and approve a schema, data-handling, and rollback plan before adding migrations. Secrets never go in this folder.
