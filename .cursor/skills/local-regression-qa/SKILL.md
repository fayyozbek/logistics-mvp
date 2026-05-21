---
name: local-regression-qa
description: Full local QA before PR for Logistics MVP+. Use before opening a pull request or after a large feature branch merge prep.
---

# Local regression QA

## When to use

- Final check before PR.
- After delete-behavior, validation, or CRUD batches.

## Goal

Confirm the branch is safe to push: tests green, build green, local API/UI smoke passed.

## Safety rules

- **Never** use production Render DB or production URLs for this skill.
- Confirm branch is **not** `main`.
- Local SQLite only for `migrate:fresh --seed`.
- Do not commit `backups/` or `.env`.

## Preconditions

```bash
git branch --show-current   # must not be main
grep VITE_API_BASE_URL .env # should be http://127.0.0.1:8000/api
```

## Validation commands

```bash
cd backend && composer validate --no-check-publish
cd backend && php artisan migrate:fresh --seed
cd backend && php artisan test
npm run build
git diff --check
```

Start stack:

```bash
cd backend && php artisan serve --host=127.0.0.1 --port=8000
npm run dev -- --host 127.0.0.1 --port 5173
```

## API smoke (all expect 200 unless noted)

| Endpoint | Method |
|----------|--------|
| `/api/health` | GET |
| `/api/dashboard` | GET |
| `/api/shipments` | GET |
| `/api/tracking` | GET |
| `/api/clients` | GET |
| `/api/managers/overview` | GET |
| `/api/finance` | GET |
| `/api/finance/report` | GET |
| `/api/telegram/settings` | GET |
| `/api/export/shipments.csv` | GET |
| `/api/export/finance.csv` | GET |
| Invalid POST `/api/shipments` `{}` | 422 |
| GET `/api/shipments/99999` | 404 |

## UI CRUD matrix

| Area | Create | Edit | Delete | Blocked delete |
|------|--------|------|--------|----------------|
| Shipments | | | soft delete | — |
| Managers | | | | active shipments |
| Clients | | | | linked shipments |
| Checkpoints | | | | — |
| Finance | — | status | — | — |
| Telegram | — | settings | — | — |

## Other checks

- [ ] API down: stop backend → banner visible, no mock data masquerading as live
- [ ] No `render.com` requests during local QA (DevTools Network)
- [ ] No infinite API polling loops
- [ ] Responsive: 1024px and 390px — nav, forms, tables usable
- [ ] No blocking console errors

## Do not

- Deploy.
- Push to `main`.
- Run production DB cleanup.

## Output format

- **PASS** / **FAIL** / **PASS WITH ISSUES**
- Command results table
- UI / validation / error matrices
- Failed items
- `ready_to_push`: yes/no
- `ready_to_create_pr`: yes/no
