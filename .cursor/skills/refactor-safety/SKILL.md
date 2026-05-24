---
name: refactor-safety
description: Safe refactor before QA or PR — minimal, behavior-preserving changes only.
---

# Refactor safety

## When to use

- Dead code removal, extract helpers, controller dedup before QA.
- User asks to "clean up" without feature changes.

## Goal

Smaller or clearer code with **identical** runtime behavior and API contracts.

## Safety rules

- Review first: list files and risks before editing.
- No API contract changes.
- No UI redesign.
- No DB migrations unless explicitly scoped.
- Stop and ask if diff grows beyond task scope.

## Files to read

- All files in task scope + their tests
- `backend/routes/api.php` (ensure routes unchanged)
- `src/api/logistics.ts` (ensure exports unchanged)

## Validation commands

```bash
cd backend && php artisan test
npm run build
git diff --stat
```

## Do not

- Rename public API fields.
- Move pages or change routes in `App.tsx` without approval.
- Combine refactor + feature in one commit without user OK.

## Output format

1. Changed files
2. What was removed/simplified
3. Behavior parity statement
4. Test/build results
5. Commit hash if committed
