---
name: delete-behavior
description: Audit or fix soft/hard/blocked delete behavior for shipments, managers, clients, and checkpoints in Logistics MVP+.
---

# Delete behavior

## When to use

- Shipment soft delete, checkpoint hard delete, blocked manager/client delete.
- Orphan records after delete.

## Goal

Predictable deletes: soft-delete shipments, hard-delete checkpoints, block unsafe manager/client deletes, keep finance records consistent.

## Safety rules

- Do not delete production data in QA skill context.
- Add/update Feature tests for every delete rule change.
- Show Russian errors when delete is blocked.

## Files to read

- `backend/app/Models/Shipment.php` (`SoftDeletes`, `booted` hooks)
- `backend/app/Models/FinanceRecord.php` (`withTrashed` on shipment)
- `backend/app/Http/Controllers/Api/*Controller.php` destroy methods
- `backend/tests/Feature/DeleteBehaviorTest.php`, `ShipmentCrudApiTest.php`, `ManagerCrudApiTest.php`, `ClientCrudApiTest.php`
- `src/pages/Shipments.tsx`, `Managers.tsx`, `Clients.tsx`, `Tracking.tsx`

## Allowed files

- `backend/**`, `src/**` (scoped)

## Expected behavior

| Entity | Delete type | Blocked when |
|--------|-------------|--------------|
| Shipment | Soft (`deleted_at`) | — |
| Checkpoint | Hard | — |
| Manager | Hard | Active shipments assigned |
| Client | Hard | Shipments or finance records reference |
| Finance | Not deleted with shipment | Preserved |

## UI

- [ ] `InlineConfirm` before delete
- [ ] Success toast on delete
- [ ] 422 → Russian message + toast (`showApiMutationError`)

## Validation commands

```bash
cd backend && php artisan test --filter=Delete
cd backend && php artisan test
npm run build
```

## Do not

- Hard-delete shipments if soft delete is the contract.
- Leave orphan checkpoints on soft-deleted shipment.

## Output format

1. Changed files
2. Delete behavior matrix
3. Test results
4. Manual smoke (if run)
5. Commit hash if committed
