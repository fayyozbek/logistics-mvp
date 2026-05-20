# Logistix — Logistics UI (MVP)

B2B logistics admin UI (React/Vite) with a Laravel API in `backend/`.

---

## Quick start (local)

### 1 — Frontend

```bash
npm install
cp .env.example .env        # then edit VITE_API_BASE_URL
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
# Edit .env: set APP_ENV=local, APP_DEBUG=true, DB_CONNECTION=sqlite,
#            comment out DATABASE_URL, set FRONTEND_URL=http://localhost:5173
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

## CORS caveat (local)

`php artisan serve` binds to **127.0.0.1:8000**. The browser treats
`localhost` and `127.0.0.1` as different origins, so CORS rules matter:

| Origin | Works with backend? |
|--------|---------------------|
| `http://localhost:5173` | **Yes** — always allowed by CORS config |
| `http://127.0.0.1:5173` | No — blocked by CORS |

Always start the Vite dev server with `--host localhost`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api npm run dev -- --host localhost --port 5173
```

---

## Deployment (Render free tier + Vercel)

> **Free-tier caveats before you start**
> - Render Free Web Services **spin down after 15 minutes of inactivity**
>   and take ~30 s to wake on the next request.
> - Render Free Web Services **do not provide Shell access** — migrations and
>   seeders must run via `start.sh` at container startup (see `RUN_MIGRATIONS`
>   and `RUN_SEEDERS` below).
> - Render Free Postgres databases **expire after 30 days** and are then
>   deleted. Export data before the expiry date if needed.

### Step 1 — Create Render Free Postgres

1. Go to [render.com](https://render.com) → **New → PostgreSQL**.
2. Name: `logistix-db`, Plan: **Free**.
3. After creation, copy the **Internal Database URL** (used inside Render)
   — it looks like `postgres://user:pass@dpg-xxx.oregon-postgres.render.com/logistix`.

### Step 2 — Create Render Web Service for the backend

1. **New → Web Service** → connect your GitHub repo.
2. **Root Directory**: `backend`
3. **Runtime**: **Docker** (Render auto-detects `backend/Dockerfile`)
4. **Plan**: Free.

No custom build or start commands are needed — `Dockerfile` and `start.sh`
handle everything.

### Step 3 — Set Render environment variables

In the Web Service → **Environment** tab, add:

| Key | Value |
|-----|-------|
| `APP_NAME` | `Logistics` |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | *(generate below)* |
| `APP_URL` | `https://your-service.onrender.com` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `DATABASE_URL` | *(Internal Database URL from Step 1)* |
| `DB_CONNECTION` | `pgsql` |
| `DB_SSLMODE` | `require` |
| `LOG_CHANNEL` | `stack` |
| `SESSION_DRIVER` | `cookie` |
| `QUEUE_CONNECTION` | `sync` |
| `CACHE_STORE` | `array` |
| `RUN_MIGRATIONS` | `true` |
| `RUN_SEEDERS` | `true` |

`start.sh` runs on every container boot (Render Free has no Shell):

- `RUN_MIGRATIONS=true` → `php artisan migrate --force` (safe to repeat)
- `RUN_SEEDERS=true` → `php artisan db:seed --force`

After the first successful deploy and demo seed, set **`RUN_SEEDERS=false`**
on Render to avoid duplicate demo data on later wake-ups (seeders are not
idempotent). Keep `RUN_MIGRATIONS=true` so new migrations apply automatically.

### Step 4 — Generate APP_KEY

Run locally and copy the output value:

```bash
cd backend && php artisan key:generate --show
```

Paste the result as the `APP_KEY` environment variable on Render.

### Step 5 — First deploy (migrations + seed on startup)

Deploy the Web Service. On the first boot, `start.sh` applies migrations and
loads demo data when `RUN_MIGRATIONS=true` and `RUN_SEEDERS=true`. No Shell
step is required.

When demo data is confirmed in the UI, set `RUN_SEEDERS=false` in Render
environment variables and redeploy.

### Step 6 — Deploy frontend to Vercel

1. Import the repo root into [vercel.com](https://vercel.com).
2. **Framework Preset**: Vite.
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`

### Step 7 — Set VITE_API_BASE_URL in Vercel

In Vercel → **Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://your-service.onrender.com/api` |

Trigger a redeploy after saving.

### Step 8 — Verify

```bash
curl https://your-service.onrender.com/api/health
# → {"status":"ok"}
```

Open your Vercel URL — the app should load live data from the Render API.

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
| `render.yaml` | Render Postgres database blueprint |
| `backend/Dockerfile` | Docker image for the Laravel API (used by Render) |
| `backend/start.sh` | Container startup: optional `migrate`/`db:seed`, then server |

See `AGENTS.md` and `docs/IMPLEMENTATION_PLAN.md` for agent rules and delivery plan.
