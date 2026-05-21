---
name: db-safety-cleanup
description: Safe Render PostgreSQL cleanup with backup and SELECT preview. Use only when user explicitly requests production or demo DB cleanup.
---

# DB safety cleanup (Render PostgreSQL)

## When to use

- User asks to clean demo/seed data on **Render** Postgres.
- Never for routine feature development.

## Goal

Reduce DB size or reset demo data without destroying schema or leaking secrets.

## Safety rules (mandatory)

1. Read `DATABASE_URL` from environment only — **never** print it in chat, logs, or commits.
2. **Backup first**: `pg_dump` to `backups/render_*_YYYYMMDD_HHMMSS.sql`
3. **SELECT preview** before any `DELETE`/`TRUNCATE`
4. Targeted cleanup SQL only — no `migrate:fresh`, no `DROP DATABASE`, no `DROP TABLE` on production
5. Verification `SELECT` counts after cleanup
6. API smoke on production health URL after cleanup
7. Set `RUN_SEEDERS=false` on Render after cleanup if re-seeding is not desired

## Allowed files

- `backups/*.sql` (local, gitignored)
- `backups/*.sh` (scripts, do not commit secrets)
- `docs/**` (runbook notes if scoped)

## Forbidden

- `php artisan migrate:fresh` on production
- Committing dumps with real credentials
- Broad `TRUNCATE` without preview counts

## Example workflow

```bash
# Load URL from env (do not echo)
export DATABASE_URL="$(grep DATABASE_URL backend/.env | cut -d= -f2-)"

pg_dump "$DATABASE_URL" -Fc -f "backups/render_before_cleanup_$(date +%Y%m%d_%H%M%S).dump"

psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM shipments;"
# ... targeted DELETE with WHERE clauses ...

psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM shipments;"
curl -s https://YOUR_RENDER_HOST/api/health
```

## Do not

- Use production DB for local QA.
- Run cleanup without user confirmation after showing SELECT preview.

## Output format

1. Backup file path (no secrets)
2. SELECT preview summary
3. SQL executed (sanitized)
4. Verification counts
5. API health result
6. Risks / rollback note (restore from dump)
