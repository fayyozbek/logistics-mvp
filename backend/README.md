# Logistix API (Laravel)

JSON API for the React/Vite logistics UI in the repository root.

See the [root README](../README.md) for full local setup, deployment, and CORS notes.

The `Dockerfile` and `start.sh` in this directory are used by Render's Docker
Web Service. The image is `php:8.4-cli-bookworm` (Symfony 8 in `composer.lock` requires
PHP >= 8.4) with extensions: `mbstring`, `bcmath`, `intl`, `opcache`, `pdo`,
`pdo_pgsql`, `pgsql`, `zip`, `pcntl`.

The Docker build does **not** run `php artisan key:generate`. Set `APP_KEY` in
Render environment variables before deploy (see root README Step 4).

Render Free has no Shell access. At startup, `start.sh` optionally runs:

- `RUN_MIGRATIONS=true` → `php artisan migrate --force`
- `RUN_SEEDERS=true` → `php artisan db:seed --force`

Then starts `php artisan serve` on `$PORT`. Demo seeders are idempotent; after
the first demo seed, set `RUN_SEEDERS=false` on Render so restarts do not reset
Telegram settings or overwrite stakeholder edits.

## Quick local setup

```bash
composer install
cp .env.example .env
# Edit .env: APP_ENV=local, APP_DEBUG=true, DB_CONNECTION=sqlite,
#            comment out DATABASE_URL, FRONTEND_URL=http://localhost:5173
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

## Tests

```bash
php artisan test
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/dashboard` | KPI summary and charts |
| GET | `/api/shipments` | Shipment list |
| POST | `/api/shipments` | Create shipment |
| GET | `/api/shipments/{id}` | Single shipment |
| PATCH | `/api/shipments/{id}/status` | Update shipment status |
| POST | `/api/shipments/{id}/checkpoints` | Add checkpoint |
| PATCH | `/api/checkpoints/{id}` | Update checkpoint |
| GET | `/api/tracking` | Tracking view |
| GET | `/api/managers` | Manager list |
| GET | `/api/finance` | Finance records |
| PATCH | `/api/finance/{id}/status` | Update finance status |
| GET | `/api/telegram/settings` | Telegram bot settings |
| PATCH | `/api/telegram/settings` | Save Telegram settings |

## Tracking numbers

Auto-generated numbers use the format `LGX-YYYY-NNNN` (e.g. `LGX-2026-0562`).
A persistent `tracking_number_counters` table stores the last sequence per calendar
year so numbers are **monotonic** and are **not reused** when shipments are deleted.
Demo seeders sync the counter from existing demo shipments after `ShipmentSeeder`.

## Finance amounts (MVP)

`PATCH /api/finance/{id}/status` accepts **`status` only** (no payment gateway or
custom `paidAmount` in the request). The API keeps amounts aligned with status:

| Status | `paid_amount` | Balance (`total_amount - paid_amount`) |
|--------|---------------|----------------------------------------|
| `paid` | equals `total_amount` | `0` |
| `unpaid`, `overdue` | `0` | equals `total_amount` |
| `partial` | between `0` and `total_amount` | greater than `0` |

When status becomes `partial` and the current `paid_amount` is already in range,
that value is kept; otherwise `paid_amount` defaults to half of `total_amount`
(demo-friendly placeholder until a dedicated payment-amount endpoint exists).

Demo seed data uses the same rules via `FinanceAmountRules`.

## CORS

`config/cors.php` allows `http://localhost:5173`, `http://127.0.0.1:5173`, and
`FRONTEND_URL` (trailing slashes are stripped). On Render set:

`FRONTEND_URL=https://logistics-mvp-sigma.vercel.app`

Redeploy the Web Service after changing this variable.
