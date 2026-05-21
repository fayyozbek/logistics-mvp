---
name: location-units-forms
description: Location autocomplete, weight/volume units, and numeric parsing for shipment forms.
---

# Location and units forms

## When to use

- Shipment create/edit location fields.
- Weight (`kg`/`ton`) and volume (`m3`/`cbm`) validation.
- Autocomplete or payload normalization bugs.

## Goal

Locations from local JSON only (English city names to API); units required when quantity set; no formatted numbers in API payload.

## Safety rules

- **No external geocoding API** — use `src/data/locations.json` only.
- User must pick from autocomplete list (or equivalent validation).
- Payload: plain numeric strings for weight/volume, not spaced thousands.

## Files to read

- `src/data/locations.json`, `src/data/locations.ts`
- `src/components/LocationAutocomplete.tsx`
- `src/components/QuantityWithUnitField.tsx`
- `src/utils/shipmentUnits.ts`, `src/utils/formValidation.ts`, `src/utils/numberFormat.ts`
- `backend/app/Http/Requests/Concerns/ShipmentQuantityRules.php`
- `backend/tests/Feature/ShipmentUnitsValidationTest.php`

## Rules

| Field | Rule |
|-------|------|
| origin/destination | `findLocationByValue` / pick from list |
| weight | Optional; if set → positive, `weightUnit` required (`kg`/`ton`) |
| volume | Optional; if set → positive, `volumeUnit` required (`m3`/`cbm`) |
| API payload | `normalizeLocationValue`, `buildWeightPayload`, `buildVolumePayload` |

## Validation commands

```bash
cd backend && php artisan test --filter=ShipmentUnits
npm run build
```

Manual: create shipment with Almaty → Tashkent from autocomplete; verify POST body.

## Do not

- Add Google Maps / OpenStreetMap API keys.
- Send `1 234.5` formatted strings to API.

## Output format

1. Changed files
2. Validation matrix (field × client × server)
3. Test/build results
4. Commit hash if committed
