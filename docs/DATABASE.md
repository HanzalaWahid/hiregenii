# Database and Storage

## Current implementation

- Candidate, recruiter, job, application, interview, and notification data use
  SQLAlchemy models in `backend/app/db/models.py` and local SQLite configured
  in `backend/app/core/config.py`. The default database path is
  `backend/data/app.db`.
- `backend/app/db/migrations.py` creates declared tables and runs startup
  migrations. It adds profile columns and conditionally adds the unique
  `(job_id, user_id)` application index. Existing duplicate applications are
  logged and are not deleted automatically.
- Current entities, relationships, and constraints are documented in
  [ERD.md](ERD.md).
- Candidate CV records contain original and anonymized resume text, removed
  identity data, extracted fields, scores, explanations, and recommendations.
  PDF/DOCX uploads are written under the local `backend/uploads/` directory.
- The resume-analysis API writes uploads temporarily and returns results
  without persisting an analysis record.

The local database and uploaded files may contain sensitive personal data.
They are not a verified production deployment or a managed private-storage
solution. Do not discard, migrate, or expose them without an approved data
handling plan.

## Supabase target (not implemented)

The documented target direction is to use Supabase-managed Auth, Database
(PostgreSQL), Row Level Security, Storage, and Realtime. The repository has no
application Supabase integration or SQL migrations, and the live project
schema has not been inspected. `supabase/migrations/` currently contains only
a placeholder.

The exact unified schema, organization/tenant model, admin role, storage
policies, data migration, retention, and deletion rules remain unresolved.
Do not treat schema proposals in earlier planning material as approved tables
or as the live Supabase schema. The PRD identifies the product decisions that
must precede database changes.
