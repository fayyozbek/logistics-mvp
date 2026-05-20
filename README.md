# Logistix — Logistics UI (MVP)

B2B logistics admin UI (React/Vite) with a Laravel API in `backend/`.

---

## Quick start

### 1 — Frontend

```bash
npm install
cp .env.example .env        # sets VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_API_BASE_URL=http://127.0.0.1:8000/api npm run dev -- --host localhost --port 5173
```

Open **http://localhost:5173** in a browser.

> **Without a running backend** the app still works — every read request
> falls back to `src/data/mock.ts` automatically. Write actions (add
> checkpoint, update status, save Telegram settings) will show an error
> message and do nothing until the backend is running.

### 2 — Backend

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed          # create tables and load demo data
php artisan serve --host=127.0.0.1 --port=8000
```

Verify:

```bash
curl http://127.0.0.1:8000/api/health
# → {"status":"ok"}
```

Run tests:

```bash
cd backend && php artisan test
```

---

## CORS caveat

`php artisan serve` binds to **127.0.0.1:8000**. The browser treats
`localhost` and `127.0.0.1` as different origins, so CORS rules matter:

| Origin | Works with backend? |
|--------|---------------------|
| `http://localhost:5173` | **Yes** — CORS allows this origin |
| `http://127.0.0.1:5173` | No — blocked by CORS |

Always start the Vite dev server with `--host localhost` (not `--host 127.0.0.1`):

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api npm run dev -- --host localhost --port 5173
```

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | `{"status":"ok"}` |
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

---

## Repository layout

| Path | Purpose |
|------|---------|
| `src/` | React/Vite application |
| `src/api/` | API adapters and mock fallback |
| `src/data/mock.ts` | Mock data (offline fallback) |
| `backend/` | Laravel JSON API |
| `docs/` | Project documentation |
| `.env.example` | Frontend environment template |
| `backend/.env.example` | Backend environment template |

See `AGENTS.md` and `docs/IMPLEMENTATION_PLAN.md` for agent rules and delivery plan.
