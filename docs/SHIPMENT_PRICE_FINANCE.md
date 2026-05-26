# Shipment service price and finance sync

**Task:** SHIPMENT-PRICE-FINANCE-001

## Field meaning

- `price_amount` / API `priceAmount`: **service / transportation price** for the shipment (MVP), not declared cargo insurance value.
- `currency`: invoice currency for the linked finance record (`USD`, `KRW`, `UZS`, `KZT`, `GEL`).

## Finance sync (MVP)

On **create** and **update** shipment (roles: admin, manager):

1. Shipment stores `price_amount` and `currency`.
2. `ShipmentFinanceSyncService` updates the related `finance_records.total_amount` and `currency` to match.
3. `paid_amount` and `status` are preserved via `FinanceAmountRules` when total changes.
4. If no finance row exists, one is created (`status: unpaid`, single line item «Стоимость перевозки»).

Demo seed: `FinanceRecordSeeder` backfills shipment price from existing finance totals after migrate.

## API

- `POST /api/shipments` — optional `priceAmount` (numeric ≥ 0), optional `currency` (default `USD`).
- `PATCH /api/shipments/{id}` — same fields.
- Responses: `priceAmount`, `currency` on shipment list/detail/tracking.

## Role visibility

| Role | Edit price | View price on shipment | View finance totals |
|------|------------|--------------------------|---------------------|
| admin | yes | yes | yes |
| manager | yes | yes | yes |
| operator | no | yes | yes |
| finance | no | yes | yes |
| viewer | no | yes | yes |

Price is shown wherever shipment detail is readable; finance page continues to use `finance_records.total_amount` (kept in sync on write).
