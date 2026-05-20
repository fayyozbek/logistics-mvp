# Logistix API (Laravel)

JSON API for the React/Vite logistics UI in the repository root.

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/up` | Laravel framework health |
| GET | `/api/health` | API health — `{ "status": "ok" }` |

## Local frontend (CORS)

Set `FRONTEND_URL` in `.env` (default `http://localhost:5173`). CORS allows that origin on `api/*` routes so the Vite app can call the API later.

The React app is **not** wired to this API yet.

## Tests

```bash
php artisan test
```
