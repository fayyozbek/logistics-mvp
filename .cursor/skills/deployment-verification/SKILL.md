---
name: deployment-verification
description: Verify Render backend and Vercel frontend after deploy. Use after merge or explicit deploy request.
---

# Deployment verification

## When to use

- After Render/Vercel deploy.
- Production smoke (not local PR QA).

## Goal

Production stack healthy: health, reads, CORS, frontend hits Render API, no localhost leaks.

## Safety rules

- Do not deploy unless user explicitly requested (use `render-vercel-deploy` for deploy steps).
- Do not run destructive DB ops during verification.
- Do not paste env secrets in output.

## Checklist

### Render backend

- [ ] `GET https://YOUR_SERVICE.onrender.com/api/health` → `{"status":"ok"}`
- [ ] Read endpoints: dashboard, shipments, tracking, clients, managers/overview, finance, telegram/settings → 200
- [ ] CSV exports → 200
- [ ] `OPTIONS` from Vercel origin → CORS headers present

### Vercel frontend

- [ ] `VITE_API_BASE_URL` points to Render `/api` (build-time var)
- [ ] Network tab: requests to Render, **not** `127.0.0.1`
- [ ] No infinite request loops on Dashboard/Shipments

### Browser smoke

- [ ] Dashboard loads metrics
- [ ] One CRUD path per area (create or edit) uses production API id

## Commands (replace host)

```bash
BASE=https://YOUR_SERVICE.onrender.com/api
curl -s "$BASE/health"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/shipments"
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS "$BASE/shipments" \
  -H "Origin: https://YOUR_APP.vercel.app" -H "Access-Control-Request-Method: GET"
```

## Do not

- Commit production URLs with tokens.
- Run `migrate:fresh` on production.

## Output format

- PASS / FAIL / PASS WITH ISSUES
- Endpoint table (URL, status)
- CORS result
- Frontend network notes
- Failed items
