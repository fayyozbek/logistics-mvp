# Cursor skills guide — Logistics MVP+

Project skills live in `.cursor/skills/<name>/SKILL.md`. Mention a skill in your Cursor task to load the workflow.

## Quick reference

| Skill | When to use | What it protects | Key validation |
|-------|-------------|------------------|----------------|
| [laravel-api-crud](../.cursor/skills/laravel-api-crud/SKILL.md) | New/changed API endpoints | JSON contracts, Feature tests | `php artisan test` |
| [react-ui-crud](../.cursor/skills/react-ui-crud/SKILL.md) | Wire UI create/edit/delete | Real IDs, toasts, state refresh | `npm run build` + browser smoke |
| [local-regression-qa](../.cursor/skills/local-regression-qa/SKILL.md) | Before PR | Full local gate, no production | migrate:fresh, test, build, smoke |
| [validation-error-handling](../.cursor/skills/validation-error-handling/SKILL.md) | 422/404/errors | Russian errors, no silent mock | test + build |
| [delete-behavior](../.cursor/skills/delete-behavior/SKILL.md) | Delete rules | Soft/hard delete, blocked deletes | Delete tests + build |
| [ui-crud-complete-audit](../.cursor/skills/ui-crud-complete-audit/SKILL.md) | Browser CRUD review | ID flow in Network tab | DevTools checklist |
| [db-safety-cleanup](../.cursor/skills/db-safety-cleanup/SKILL.md) | Render DB cleanup | Backup + SELECT before DELETE | pg_dump, verify SQL |
| [deployment-verification](../.cursor/skills/deployment-verification/SKILL.md) | After deploy | Health, CORS, live API | curl + browser |
| [product-audit-pdf](../.cursor/skills/product-audit-pdf/SKILL.md) | UX/product audit | docs/audit artifacts | No code change (review) |
| [responsive-ui-audit](../.cursor/skills/responsive-ui-audit/SKILL.md) | Mobile/tablet layout | Overflow, modals, nav | build + viewports |
| [refactor-safety](../.cursor/skills/refactor-safety/SKILL.md) | Safe cleanup refactors | Behavior parity | test + build |
| [pr-prep](../.cursor/skills/pr-prep/SKILL.md) | Open PR | No secrets on branch | git status + QA done |
| [demo-readiness](../.cursor/skills/demo-readiness/SKILL.md) | Before demo | Wake Render, script | health + DEMO_SCRIPT |
| [render-vercel-deploy](../.cursor/skills/render-vercel-deploy/SKILL.md) | Deploy (explicit only) | Env checklist | post-deploy verify |
| [finance-reporting](../.cursor/skills/finance-reporting/SKILL.md) | Finance/report/export | Status consistency | Finance tests |
| [location-units-forms](../.cursor/skills/location-units-forms/SKILL.md) | Locations/units | Local JSON, unit rules | ShipmentUnits tests |

## Always-on rules

See `.cursor/rules/`:

| Rule | Topic |
|------|--------|
| `00-project-scope.mdc` | MVP+ boundaries, no auth unless scoped |
| `10-git-and-branch-safety.mdc` | Feature branches, no push to main |
| `20-secrets-and-production-safety.mdc` | No prod DB for local QA |
| `30-backend-laravel-api.mdc` | Laravel API + tests |
| `40-frontend-react-ui.mdc` | UI feedback + build |
| `50-api-contract-and-id-flow.mdc` | IDs and mock fallback |
| `60-qa-gates.mdc` | Pre-PR and post-deploy gates |
| `70-documentation-and-output.mdc` | Agent output format |

## Example task prompts

```
Task: Add PATCH for client notes — use laravel-api-crud and react-ui-crud.
Run php artisan test and npm run build. Do not deploy.
```

```
Task: Review-only local QA before PR — use local-regression-qa.
Return PASS/FAIL matrices. Do not commit.
```

```
Task: Clean Render demo DB — use db-safety-cleanup only.
Backup first, SELECT preview, no migrate:fresh.
```

## Installing for a new machine

Skills and rules are **in the repo** — clone/pull is enough. No extra install step.

Optional: in Cursor, ensure **Project Rules** and **Skills** load from `.cursor/`.

## See also

- [AI_WORKFLOW.md](AI_WORKFLOW.md)
- [.cursor/README.md](../.cursor/README.md)
