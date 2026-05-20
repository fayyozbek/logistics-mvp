# Prompt rules for agents and humans

Use these patterns when assigning work on the logistics UI project.

## Task framing

**Good**

- "Fix shipment table sorting on `Shipments.tsx`; keep existing styles."
- "Add mock row for delayed status in `src/data/mock.ts`."
- "Run `npm run build` and fix TypeScript errors from the last change."

**Bad**

- "Rebuild the dashboard in a new design system."
- "Copy this UI into `client-logistics-ui` for the main app."
- "Add Laravel auth and PostgreSQL now."

## Required context in every task

1. **Goal** — one sentence outcome.
2. **Scope** — files or areas allowed to change.
3. **Constraints** — preserve visuals, mocks only, no backend, etc.
4. **Validation** — e.g. `npm run build`, manual page check.

## Agent behavior

| Rule | Instruction |
|------|-------------|
| 1 | This project root is the main project. |
| 2 | Stakeholder UI in `src/` is the source of truth. |
| 3 | Do not move UI into another project. |
| 4 | Do not create `reference/client-logistics-ui`. |
| 5 | Preserve existing visual direction. |
| 6 | Improve only when required by the task. |
| 7 | Keep changes small and task-based. |
| 8 | Use mock data until backend integration starts. |
| 9 | Do not introduce backend until explicitly requested. |
| 10 | Do not commit `node_modules` or `dist`. |
| 11 | Run `npm run build` after frontend changes. |
| 12 | Run backend tests only after `backend/` exists. |
| 13 | Commit only if build passes (and user requested commit). |
| 14 | Return concise summaries only. |

## Response format (agents)

When finishing a task, return only:

- Changed files (list)
- Short summary (2–5 sentences)
- Commands executed
- Commit hash (if committed)
- Assumptions or risks (bullets)

Avoid long narratives, unrelated refactors, or drive-by dependency upgrades.

## Forbidden requests (reject or narrow)

- Full UI rewrite or new brand/theme without approval
- Creating parallel reference folders or duplicate apps
- Backend, migrations, or real API keys before frontend sign-off
- Committing build output or dependencies

## Example prompt template

```text
Task: [ID] — [title]
Mode: Implement | Review | Docs only

Goal: [one sentence]

Allowed: src/pages/Shipments.tsx, src/data/mock.ts
Forbidden: backend/, package.json (unless task says otherwise)

Constraints:
- Preserve stakeholder layout and CSS
- Mock data only
- Small diff

Validation:
- npm run build

Commit: yes | no
```
