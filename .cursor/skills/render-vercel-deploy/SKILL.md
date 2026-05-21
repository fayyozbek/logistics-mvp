---
name: render-vercel-deploy
description: Deploy Laravel backend to Render and frontend to Vercel after PR merge. Use only when user explicitly requests deploy.
---

# Render + Vercel deploy

## When to use

- User explicitly says deploy, release, or push to production.
- Typically **after** PR merge to main.

## Goal

Backend on Render, frontend on Vercel, env aligned, CORS working.

## Safety rules

- **No deploy** unless user explicitly requested in the task.
- Do not run `migrate:fresh` on production.
- Do not print `DATABASE_URL` or secrets.
- After demo DB cleanup: set `RUN_SEEDERS=false` on Render.

## Render (backend)

Verify env (names only in docs — values from dashboard):

| Variable | Notes |
|----------|--------|
| `APP_ENV` | `production` |
| `APP_KEY` | set |
| `DATABASE_URL` | Render Postgres |
| `FRONTEND_URL` | Vercel origin |
| `RUN_SEEDERS` | `false` after cleanup |

Deploy: push to connected branch or manual deploy in Render dashboard.

Post-deploy:

```bash
curl -s https://YOUR_SERVICE.onrender.com/api/health
```

## Vercel (frontend)

| Variable | Notes |
|----------|--------|
| `VITE_API_BASE_URL` | `https://YOUR_SERVICE.onrender.com/api` |

Redeploy after env change (build-time variable).

## CORS

- `FRONTEND_URL` must match Vercel URL.
- Run `deployment-verification` skill after deploy.

## Do not

- Deploy from unreviewed feature branch unless user instructs.
- Commit `.env` files.

## Output format

1. What was deployed (backend/frontend/both)
2. URLs (health + app)
3. Env checklist (names only)
4. Verification result or link to run deployment-verification
5. Recommendation: production smoke with `ui-crud-complete-audit` on production URLs
