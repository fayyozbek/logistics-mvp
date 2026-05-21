---
name: react-ui-crud
description: Connect React pages to Laravel CRUD APIs with real IDs, forms, toasts, and state refresh. Use for manager, client, shipment, checkpoint, finance, or Telegram UI write flows.
---

# React UI CRUD

## When to use

- Wiring create/edit/delete in `src/pages/*` to `src/api/logistics.ts`.
- Fixing stale UI after writes or missing error feedback.

## Goal

Browser flows call the configured API with real IDs and show clear Russian success/error feedback.

## Safety rules

- Preserve existing layout and styling.
- Use `selected.id` / API-returned `id` — never hardcoded `"1"` or `"2"` for writes.
- Do not silently fall back to mock when `VITE_API_BASE_URL` is set.
- Minimal page-level diffs only.

## Files to read

- `src/pages/Shipments.tsx`, `Managers.tsx`, `Clients.tsx`, `Tracking.tsx`, `Finance.tsx`, `Telegram.tsx`
- `src/api/logistics.ts`, `src/api/client.ts`, `src/api/loadError.ts`
- `src/utils/apiErrors.ts`, `src/utils/formValidation.ts`
- `src/types/api.ts`
- `backend/routes/api.php` (contract reference)

## Allowed files

- `src/**` (task-scoped)
- `src/types/api.ts` if payloads need typing only

## Forbidden files

- `backend/**` unless task includes API changes
- `.env`, lockfiles unless approved
- Full redesign / new component library

## Workflow

1. Use `create*` / `update*` / `delete*` from `src/api/logistics.ts`.
2. On success: `showToast`, reload or merge entity into state, close modal/exit edit mode.
3. On `ApiError` with `validationErrors`: `formatFieldErrors` + `FormErrorList`.
4. On other errors: `showApiMutationError`.
5. Confirm before destructive delete (`InlineConfirm`).
6. Run build.

## Validation commands

```bash
npm run build
```

Manual smoke (API running, `.env` has `VITE_API_BASE_URL=http://127.0.0.1:8000/api`):

```bash
cd backend && php artisan serve --host=127.0.0.1 --port=8000
npm run dev -- --host 127.0.0.1 --port 5173
```

Checklist:

- [ ] Create returns new row with new `id` in Network tab
- [ ] Edit sends `PATCH` to `/api/{resource}/{actualId}`
- [ ] Delete sends `DELETE` to actual id
- [ ] List/detail updates without hard refresh
- [ ] 422 shows inline errors + toast

## Do not

- Change API payload keys without backend alignment.
- Hide errors in empty `catch` blocks.

## Output format

1. Changed files
2. Summary
3. UI CRUD matrix (page × create/edit/delete)
4. Commands + build result
5. Manual smoke notes
6. Commit hash if committed
