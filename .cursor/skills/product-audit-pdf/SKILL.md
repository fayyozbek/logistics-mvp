---
name: product-audit-pdf
description: Create product audit with Markdown, PDF, findings JSON, and screenshots in docs/audit. Review-only unless user asks to fix issues.
---

# Product audit PDF

## When to use

- Stakeholder audit, UX review, market-gap analysis with screenshots.
- Review-only by default.

## Goal

Timestamped audit package under `docs/audit/` without changing product code.

## Safety rules

- Do **not** commit `docs/audit/*` unless user explicitly requests.
- Do not modify `src/` or `backend/` in review mode.
- Screenshots may contain demo data — no real credentials.

## Output structure

```
docs/audit/YYYYMMDD_HHMMSS/
  REPORT.md
  REPORT.pdf
  findings.json
  screenshots/
    ISSUE-001-dashboard.png
    ...
```

## findings.json shape (example)

```json
{
  "generatedAt": "ISO-8601",
  "issues": [
    { "id": "ISSUE-001", "severity": "medium", "area": "shipments", "title": "...", "recommendation": "..." }
  ]
}
```

## Coverage

- UX clarity for non-technical users
- Responsive breakpoints (1440, 1024, 768, 430, 390)
- Date filters / dashboard accuracy
- Market gap notes (auth, payments, etc. as post-MVP)
- Russian copy consistency

## Allowed files

- `docs/audit/**` (new)
- `docs/*.md` references only if scoped

## Forbidden

- `src/**`, `backend/**` in review mode
- Committing audit folder by default

## Do not

- Redesign product as part of audit.
- Store secrets in screenshots.

## Output format

1. Audit folder path
2. Issue count by severity
3. Top findings (bullets)
4. PDF path
5. Whether committed (default: no)
