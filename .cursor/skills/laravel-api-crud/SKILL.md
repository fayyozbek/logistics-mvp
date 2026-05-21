---
name: laravel-api-crud
description: Add or change Laravel API CRUD endpoints for Logistics MVP+. Use when implementing backend routes, controllers, Form Requests, resources, or feature tests for shipments, managers, clients, checkpoints, finance, or exports.
---

# Laravel API CRUD

## When to use

- New or changed `POST` / `PATCH` / `DELETE` / `GET` API behavior in `backend/`.
- Validation, resources, model mapping, or delete rules.

## Goal

Ship a contract-stable JSON API with feature tests and safe error responses.

## Safety rules

- Do **not** change response JSON shapes unless the task scopes a contract change.
- Do **not** add auth/JWT/roles unless explicitly scoped.
- Do **not** touch production DB.
- Prefer minimal diffs in controllers; reuse `MapsValidatedAttributes`, Form Requests, Resources.

## Files to read

- `backend/routes/api.php`
- `backend/app/Http/Controllers/Api/*`
- `backend/app/Http/Requests/*`
- `backend/app/Http/Resources/*`
- `backend/app/Models/*`
- `backend/tests/Feature/*`
- `docs/MVP_PLUS_SCOPE.md`

## Allowed files

- `backend/**` (scoped to task)
- `backend/tests/Feature/**`

## Forbidden files

- `src/**` (unless task also wires frontend)
- `.env`, `backend/.env`
- `backups/**`
- `package.json`, `composer.json` lock changes unless approved

## Workflow

1. Add route in `api.php`.
2. Implement controller method; use Form Request for validation.
3. Return existing resource shape (`{ shipment }`, `{ manager }`, etc.).
4. Add/update Feature test mirroring happy path + 422 + 404 where relevant.
5. Run tests.

## Validation commands

```bash
cd backend && composer validate --no-check-publish
cd backend && php artisan test
```

For local smoke after changes:

```bash
cd backend && php artisan serve --host=127.0.0.1 --port=8000
curl -s http://127.0.0.1:8000/api/health
```

## Do not

- Run `migrate:fresh` on production.
- Print secrets from `.env`.
- Return HTML errors on `api/*` routes.

## Output format

Return only:

1. Changed files
2. Summary
3. Endpoint matrix (method, path, status, notes)
4. Commands executed
5. `php artisan test` result
6. Commit hash if committed
7. Contract risks if any
