# Cursor configuration — Logistics MVP+

Shared guardrails for developers and AI agents working in this repository.

## What lives here

| Path | Purpose |
|------|---------|
| [rules/](rules/) | Always-on project rules (scope, git, secrets, API, QA) |
| [skills/](skills/) | Reusable workflows invoked per task type |

Human-oriented index: [docs/CURSOR_SKILLS_GUIDE.md](../docs/CURSOR_SKILLS_GUIDE.md)  
Team workflow: [docs/AI_WORKFLOW.md](../docs/AI_WORKFLOW.md)

## Rules vs skills

- **Rules** — loaded automatically; short constraints (do not push to main, no production `migrate:fresh`, preserve API shapes).
- **Skills** — read when a task matches (e.g. “add manager CRUD” → `laravel-api-crud` + `react-ui-crud`).

## Recommended workflow

1. **Branch** — `git checkout -b feature/your-task` (never commit directly to `main`).
2. **Pick skills** — match task to [CURSOR_SKILLS_GUIDE.md](../docs/CURSOR_SKILLS_GUIDE.md).
3. **Implement** — minimal diff; run tests/build from skill.
4. **Local QA** — [skills/local-regression-qa/SKILL.md](skills/local-regression-qa/SKILL.md).
5. **PR** — [skills/pr-prep/SKILL.md](skills/pr-prep/SKILL.md).
6. **Deploy** — only after merge and **explicit** request → [skills/render-vercel-deploy/SKILL.md](skills/render-vercel-deploy/SKILL.md) → [skills/deployment-verification/SKILL.md](skills/deployment-verification/SKILL.md).

## Legacy rules

Older files (`00-project-overview.mdc`, `10-frontend-rules.mdc`, etc.) may still exist. Prefer the numbered `00`–`70` rules in this folder for MVP+ work; they reflect the current Laravel backend and deployment setup.

## For new teammates

1. Clone repo, copy `.env.example` → `.env` and `backend/.env.example` → `backend/.env`.
2. Read [README.md](../README.md) quick start.
3. Open this README and [docs/AI_WORKFLOW.md](../docs/AI_WORKFLOW.md).
4. In Cursor, mention the skill name in your task (e.g. “Use local-regression-qa before PR”).
