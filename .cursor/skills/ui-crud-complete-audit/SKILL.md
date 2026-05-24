---
name: ui-crud-complete-audit
description: Browser-based CRUD verification for all Logistics MVP+ write flows. Use for review-only or post-implementation QA with DevTools.
---

# UI CRUD complete audit

## When to use

- Review task: verify all write flows through the browser.
- Before stakeholder demo or production QA.

## Goal

Confirm each CRUD path uses real API IDs in Network tab and updates UI state.

## Safety rules

- Review-only unless task says Implement.
- Local URLs only: `http://127.0.0.1:8000/api`, `http://localhost:5173`.
- Do not use production for this audit unless task says production QA.

## Files to read

- `src/pages/Shipments.tsx`, `Managers.tsx`, `Clients.tsx`, `Tracking.tsx`, `Finance.tsx`, `Telegram.tsx`
- `src/api/logistics.ts`
- `docs/DEMO_SCRIPT.md`

## Environment

```bash
cd backend && php artisan migrate:fresh --seed
cd backend && php artisan serve --host=127.0.0.1 --port=8000
npm run dev -- --host 127.0.0.1 --port 5173
```

`.env`: `VITE_API_BASE_URL=http://127.0.0.1:8000/api`

## DevTools checks

For each write:

- Request URL contains **returned** id (not hardcoded seed id unless that entity was selected).
- Method: `POST` / `PATCH` / `DELETE`.
- Response 200/201; UI updates without full reload.

## Matrix (mark PASS/FAIL/NOT TESTED)

| Flow | Create | Edit | Status/other | Delete | Blocked delete |
|------|--------|------|--------------|--------|----------------|
| Shipments | | | status update | soft | — |
| Managers | | | — | | active shipments |
| Partners/clients | | | — | | linked shipments |
| Checkpoints | | | status | | — |
| Finance | — | status | export CSV | — | — |
| Telegram | — | save settings | — | — | — |

## Do not

- Modify source in review mode.
- Commit audit screenshots unless requested.

## Output format

- Overall: PASS / FAIL / PASS WITH ISSUES
- UI CRUD matrix
- ID-flow violations (if any)
- Console/network issues
- Recommendations
