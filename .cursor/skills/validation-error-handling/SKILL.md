---
name: validation-error-handling
description: Audit or fix backend 422/404 JSON and frontend visible validation and API error handling for Logistics MVP+.
---

# Validation and error handling

## When to use

- Missing validation on API inputs.
- English-only errors while UI is Russian.
- Silent API failures or mock fallback masking errors.

## Goal

Consistent Russian-friendly 422/404 JSON and visible frontend errors (forms + toasts + API-unavailable banner).

## Safety rules

- Preserve API response wrapper shape (`message`, `errors`).
- Do not redesign forms.
- Local tests only.

## Files to read

- `backend/bootstrap/app.php` (API exception rendering)
- `backend/app/Http/Middleware/SetApiLocale.php`
- `backend/lang/ru/validation.php`
- `backend/app/Http/Requests/**`
- `backend/tests/Feature/ValidationResponseTest.php`
- `src/api/client.ts`, `src/api/loadError.ts`
- `src/utils/apiErrors.ts`, `src/utils/formValidation.ts`
- `src/components/ApiLoadErrorPanel.tsx`, `ApiUnavailableBanner.tsx`
- Relevant `src/pages/*`

## Allowed files

- `backend/**`, `src/**` per task scope

## Forbidden

- Production deploy
- Changing unrelated endpoints

## Backend checklist

- [ ] `POST` empty shipment → 422, `message`: `Проверьте введённые данные.`
- [ ] Missing entity → 404, `message`: `Запись не найдена.`
- [ ] Shipment fields: `clientId`, `managerId`, `origin`, `destination`, `cargo`, `weight`, `weightUnit`, `volume`, `volumeUnit`
- [ ] Manager/client/checkpoint/finance status validated
- [ ] Feature tests updated

## Frontend checklist

- [ ] `FormErrorList` on forms
- [ ] `showApiMutationError` on failed mutations
- [ ] Client-side guards (required client, location from list) before submit where applicable
- [ ] Configured API + failed load → banner/panel, not mock list

## Validation commands

```bash
cd backend && php artisan test
npm run build
```

## Do not

- Commit `.env` or secrets.
- Remove mock fallback for **unconfigured** API (still valid for offline demo without `VITE_API_BASE_URL`).

## Output format

1. Changed files
2. Validation matrix (case × backend × frontend)
3. Error handling matrix
4. Commands + test/build results
5. Commit hash if committed
