# Logistix API (Laravel)

JSON API for the React/Vite logistics UI in the repository root.

See the [root README](../README.md) for full local setup, deployment, and CORS notes.

The `Dockerfile` and `start.sh` in this directory are used by Render's Docker
Web Service. The image is `php:8.4-cli-bookworm` (Symfony 8 in `composer.lock` requires
PHP >= 8.4) with extensions: `mbstring`, `bcmath`, `intl`, `opcache`, `pdo`,
`pdo_pgsql`, `pgsql`, `zip`, `pcntl`.

Render Free has no Shell access. At startup, `start.sh` optionally runs:

- `RUN_MIGRATIONS=true` → `php artisan migrate --force`
- `RUN_SEEDERS=true` → `php artisan db:seed --force`

Then starts `php artisan serve` on `$PORT`. After the first demo seed, set
`RUN_SEEDERS=false` on Render to avoid duplicate rows.

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

## CORS

`config/cors.php` always allows `http://localhost:5173` for local development.
Set `FRONTEND_URL` in `.env` to also allow the deployed Vercel frontend in
production (e.g. `https://your-app.vercel.app`).
