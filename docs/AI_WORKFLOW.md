# AI and developer workflow — Logistics MVP+

How the team (and Cursor agents) should work on this repo.

## Stack reminder

| Layer | Local | Production |
|-------|-------|------------|
| Frontend | Vite `http://localhost:5173` | Vercel |
| API | Laravel `http://127.0.0.1:8000/api` | Render |
| Database | SQLite (`migrate:fresh --seed`) | PostgreSQL (Render) |

## Feature task flow

1. Create a **feature branch** (not `main`).
2. Read task scope and matching Cursor skill(s) under `.cursor/skills/`.
3. Implement **minimal** changes; preserve UI style and API contracts.
4. Validate:
   - `cd backend && php artisan test`
   - `npm run build`
5. Commit only when user asks and validation passes.
6. Run **local regression QA** (skill: `local-regression-qa`).
7. Open PR (skill: `pr-prep`).

## QA flow (local, before PR)

```bash
cd backend && composer validate --no-check-publish
cd backend && php artisan migrate:fresh --seed
cd backend && php artisan test
npm run build
```

Start servers for UI smoke:

```bash
cd backend && php artisan serve --host=127.0.0.1 --port=8000
npm run dev -- --host 127.0.0.1 --port 5173
```

Verify CRUD, validation errors, API-down banner, no production URLs in Network tab.

## DB cleanup flow (Render only)

Only when explicitly requested:

1. Skill: `db-safety-cleanup`
2. `pg_dump` backup → `backups/`
3. `SELECT` preview counts
4. Targeted `DELETE` / cleanup SQL
5. Verify counts + `/api/health`
6. Set `RUN_SEEDERS=false` on Render if needed

**Never** `migrate:fresh` or `DROP` on production.

## Deploy flow

Only after **PR merge** or explicit user instruction:

1. Skill: `render-vercel-deploy`
2. Skill: `deployment-verification`
3. Optional: `demo-readiness` before stakeholder call

## PR flow

- No direct push to `main`
- PR body includes test/build results and manual smoke notes
- No deploy in the same step as PR unless user asks

## What not to do

| Action | Why |
|--------|-----|
| Use production DB locally | Data risk, wrong environment |
| Commit `.env`, dumps, `backups/` | Secrets and size |
| Silent mock when API configured | Hides real failures |
| Redesign UI without approval | Stakeholder prototype is source of truth |
| Add auth/JWT/roles | Post-MVP unless task says otherwise |
| Deploy without request | Controlled releases |
| Change API JSON shapes casually | Breaks Vercel frontend |

## Cursor entry points

- Rules: `.cursor/rules/*.mdc`
- Skills index: [CURSOR_SKILLS_GUIDE.md](CURSOR_SKILLS_GUIDE.md)
- Cursor folder README: [.cursor/README.md](../.cursor/README.md)

## Related docs

- [MVP_PLUS_SCOPE.md](MVP_PLUS_SCOPE.md) — feature scope
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md) — stakeholder demo
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — architecture context
- [PROMPT_RULES.md](PROMPT_RULES.md) — how to phrase tasks
