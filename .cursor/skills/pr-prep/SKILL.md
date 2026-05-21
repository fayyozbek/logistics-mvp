---
name: pr-prep
description: Prepare feature branch for push and GitHub PR after local QA passes.
---

# PR prep

## When to use

- Branch is ready for review after `local-regression-qa` PASS or PASS WITH ISSUES (documented).

## Goal

Clean PR: correct branch, no secrets, validation summarized, no deploy.

## Safety rules

- Branch must **not** be `main`.
- Do not push to `main`.
- Do not deploy in this skill.
- Do not stage `.env`, `backend/.env`, `backups/`, dumps.

## Preconditions

```bash
git branch --show-current
git status
git diff --check
cd backend && php artisan test
npm run build
```

## Steps

1. Confirm local QA results (paste or reference matrices).
2. `git add` only task files — never secrets.
3. `git push -u origin HEAD` (not main).
4. `gh pr create` with title + body:

```markdown
## Summary
- ...

## Test plan
- [ ] php artisan test (86 passed)
- [ ] npm run build
- [ ] Local API smoke
- [ ] UI CRUD smoke (list areas tested)

## Notes
- No production deploy in this PR
```

## Allowed files

- Git operations only; no product code changes unless fixing PR blockers.

## Do not

- Force-push `main`.
- Include `backups/` or audit artifacts unless requested.

## Output format

1. Branch name
2. PR URL
3. Commits included
4. Validation summary
5. Explicit: deploy not performed
