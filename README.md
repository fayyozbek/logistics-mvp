# Logistix — Logistics UI (MVP)

B2B logistics admin UI (React/Vite) with a planned Laravel API in `backend/`.

## Frontend

```bash
npm install
npm run dev
npm run build
```

Dev server: [http://localhost:5173](http://localhost:5173)

Optional API (pages still use mocks until wired):

```bash
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:8000/api
```

Data access: `src/api/` (`getShipments()`, etc.). If `VITE_API_BASE_URL` is unset or the API is unreachable, responses fall back to `src/data/mock.ts`.

See `AGENTS.md` and `docs/` for agent rules and implementation plan.

## Backend API

Laravel API lives in `backend/`. Not wired to the frontend yet.

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
