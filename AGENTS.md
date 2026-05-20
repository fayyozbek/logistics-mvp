# Agent instructions — Logistics UI

This repository is the **main implementation** for the client logistics UI. Work happens **in place** on the stakeholder-provided React/Vite prototype.

## Project identity

| Item | Value |
|------|--------|
| Root | This repo (`Logistics-MVP`) |
| UI source of truth | Stakeholder-provided prototype in `src/` |
| Frontend | React, TypeScript, Vite, CSS |
| Backend (planned) | Laravel API in `backend/` — **not started** |
| Data (current) | Mock data in `src/data/` until API integration |

## Non-negotiables

1. **Do not** treat this UI as a reference to copy into another project.
2. **Do not** create `reference/`, `client-logistics-ui/`, or parallel UI folders.
3. **Do not** redesign from scratch or replace the visual direction without explicit approval.
4. **Do not** add backend code until explicitly requested (after frontend audit/stabilization).
5. **Do not** commit `node_modules/`, `dist/`, or build artifacts.

## Workflow

- Keep changes **small** and **task-based**.
- Use **mock data** until backend integration is approved.
- After frontend changes: run `npm run build`.
- Commit only when the build passes and the user asks for a commit.
- Return **concise summaries** (changed files, commands, risks).

## Documentation map

| File | Purpose |
|------|---------|
| [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) | Stack, structure, phased delivery |
| [docs/PROMPT_RULES.md](docs/PROMPT_RULES.md) | How to phrase tasks for agents |
| [.cursor/rules/](.cursor/rules/) | Cursor rule files (auto-loaded) |

## Rule files

- `00-project-overview.mdc` — project identity and constraints
- `10-frontend-rules.mdc` — React/Vite/CSS conventions
- `20-backend-rules.mdc` — Laravel placeholder (inactive until backend exists)
- `30-testing-and-commits.mdc` — build, test, commit policy
- `40-scope-control.mdc` — scope limits and forbidden actions
