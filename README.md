# Logistix — Logistics UI (MVP)

B2B logistics admin UI (React/Vite) with a planned Laravel API in `backend/`.

## Frontend

```bash
npm install
npm run dev
npm run build
```

Dev server: [http://localhost:5173](http://localhost:5173)

Connect to the backend API:

```bash
cp .env.example .env        # contains VITE_API_BASE_URL=http://localhost:8000/api
npm run dev
```

All pages (Dashboard, Shipments, Tracking, Managers, Finance, Telegram) load data via `src/api/`. If `VITE_API_BASE_URL` is unset or the backend is unreachable, every request automatically falls back to `src/data/mock.ts` — the app always works offline.

See `AGENTS.md` and `docs/` for agent rules and implementation plan.

## Backend API

Laravel API lives in `backend/`. Connected to the frontend via the adapter in `src/api/`.

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

- Framework health: `GET http://localhost:8000/up`
- API health: `GET http://localhost:8000/api/health`

```bash
cd backend && php artisan test
```

## Repository layout

| Path | Purpose |
|------|---------|
| `src/` | React application |
| `backend/` | Laravel API |
| `docs/` | Project documentation |
