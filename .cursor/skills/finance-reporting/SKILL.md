---
name: finance-reporting
description: Finance report, status updates, and CSV export consistency for Logistics MVP+.
---

# Finance reporting

## When to use

- Finance page, report endpoint, status PATCH, CSV export changes.
- Paid/partial/unpaid inconsistencies.

## Goal

Finance records, report aggregates, and UI status match; export matches table data.

## Safety rules

- Preserve `FinanceRecord` status enum unless scoped.
- No impossible states (e.g. paid amount > total without partial).
- Add API tests for report and status changes.

## Files to read

- `backend/app/Http/Controllers/Api/FinanceController.php`
- `backend/app/Http/Controllers/Api/ExportController.php`
- `backend/app/Models/FinanceRecord.php`
- `backend/tests/Feature/FinanceDataConsistencyTest.php`, `FinanceReportApiTest.php`
- `src/pages/Finance.tsx`
- `src/utils/financeReport.ts`, `src/utils/exportCsv.ts`

## Validation commands

```bash
cd backend && php artisan test --filter=Finance
cd backend && php artisan test
npm run build
```

API smoke:

```bash
curl -s http://127.0.0.1:8000/api/finance
curl -s http://127.0.0.1:8000/api/finance/report
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/export/finance.csv
curl -s -X PATCH http://127.0.0.1:8000/api/finance/1/status \
  -H 'Content-Type: application/json' -d '{"status":"paid"}'
```

## UI checks

- [ ] Status change updates row
- [ ] Report totals align with records
- [ ] Export downloads CSV (configured API)

## Do not

- Add payment gateway integration unless scoped.
- Change finance JSON field names without frontend update.

## Output format

1. Changed files
2. Status/report matrix
3. Test + build results
4. Export verification
5. Commit hash if committed
