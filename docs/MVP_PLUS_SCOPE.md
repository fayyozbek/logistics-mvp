# MVP Plus — client demo scope

**Task:** SCOPE-MVP-PLUS-001  
**Status:** Documentation only — no product implementation in this task.  
**Audience:** stakeholders evaluating a fuller operational demo on the deployed Vercel + Render stack.

---

## 1. Purpose

The **initial MVP** proves core read paths, create shipment, status updates, checkpoint add/update (API), finance status, and Telegram settings persistence. For the **next client demo (MVP+)**, stakeholders should see a believable day-to-day operations loop: maintain master data (managers, partners/clients), full shipment lifecycle (create → edit → delete), rich tracking, finance reporting, and data exchange (Excel), with clearer input validation and formatting.

MVP+ is a **demo-scope contract**: what must work live in the UI against the API before the meeting. Implementation tasks will reference this document.

**Deployed stack (unchanged):**

| Layer | URL |
|-------|-----|
| Frontend | https://logistics-mvp-sigma.vercel.app |
| API | https://logistics-mvp.onrender.com/api |

**Baseline demo script (MVP, read-only flows):** [DEMO_SCRIPT.md](DEMO_SCRIPT.md)

---

## 2. In scope — MVP+ demo flows

Each flow lists **demo intent**, **minimum behavior**, and **QA expectations** (pass/fail for pre-demo checklist).

### 2.1 Dashboard

| Item | Detail |
|------|--------|
| **Demo intent** | Open with live KPIs and charts; show that edits elsewhere (shipments, finance) eventually reflect aggregates. |
| **Minimum behavior** | `GET /api/dashboard` loads without mock fallback; KPI cards and charts render from API data; period tabs filter or relabel consistently (no broken empty state when DB has data). |
| **QA expectations** | Health OK; dashboard request 200; no CORS/console errors; counts align with shipment/finance tables within reasonable lag (same request cycle or after refresh). |

---

### 2.2 Shipments CRUD

| Item | Detail |
|------|--------|
| **Demo intent** | Create a shipment, fix mistakes via edit, remove test rows via delete — full lifecycle in one session. |
| **Minimum behavior** | **Create:** form with client, manager, transport, route, cargo, weight/volume (see §2.9); unique tracking number; persists via API. **Read:** list + detail as today. **Update:** edit fields (route, client, manager, cargo, weight/volume, dates) via API + UI. **Delete:** remove shipment and dependent checkpoints/finance link rules documented; confirm dialog; row gone after refresh. |
| **QA expectations** | Create → appears in list with new tracking number; edit → detail reflects changes after save and refresh; delete → row absent from `GET /api/shipments` and tracking; no reuse of deleted tracking numbers without explicit product rule; no orphan checkpoints for deleted shipment. |

**Known MVP gaps to close:** edit/delete shipment UI and API; tracking-number reuse after delete (FIX-TRACKING-NUMBER-001).

---

### 2.3 Tracking checkpoint CRUD

| Item | Detail |
|------|--------|
| **Demo intent** | Build and adjust a route timeline during the demo without workarounds. |
| **Minimum behavior** | **Create:** add checkpoint (city, address, planned time, status). **Read:** timeline on Tracking and Shipment detail. **Update:** change status, times, address. **Delete:** remove mistaken checkpoint with confirmation. |
| **QA expectations** | Add checkpoint via UI (no modal overlay blocking submit — FIX-TRACKING-MODAL-001); `POST`/`PATCH`/`DELETE` succeed; timeline order stable; map/progress updates; refresh retains changes. |

**Known MVP gaps:** checkpoint modal overlay blocks UI submit; API accepts `plannedAt` when called directly.

---

### 2.4 Managers CRUD

| Item | Detail |
|------|--------|
| **Demo intent** | Show that ops can onboard and maintain manager profiles tied to shipments. |
| **Minimum behavior** | **List** managers (card or table). **Create** name, contact, active flag. **Update** profile fields. **Delete** only when not referenced by active shipments (or soft-delete with clear UX). Managers page in nav with clear purpose (merge with Users avoided for MVP+). |
| **QA expectations** | New manager in create-shipment dropdown after save; edit visible on Managers page; delete blocked or cascades per documented rule; `GET /api/managers` matches UI. |

**Known MVP gap:** `GET /api/managers` only; Managers page exists but not full CRUD API.

---

### 2.5 Partners / Clients CRUD

| Item | Detail |
|------|--------|
| **Demo intent** | Maintain B2B partner directory used on shipments and finance. |
| **Minimum behavior** | **List** clients (companies). **Create** legal/display name, contact, identifiers as needed. **Update** partner details. **Delete** with guard if shipments reference client. Used in shipment create/edit dropdowns. |
| **QA expectations** | Create client → selectable on new shipment; edit → shipment detail shows new name; delete rules enforced with user-visible message; no duplicate-name explosion in dropdowns after cleanup. |

**Known MVP gap:** clients only via seed/API read; no client CRUD endpoints in current API.

---

### 2.6 Finance reports

| Item | Detail |
|------|--------|
| **Demo intent** | Show invoicing posture: totals, debt, status changes, expandable line items — suitable for finance stakeholder questions. |
| **Minimum behavior** | Summary KPIs; invoice table with filters (status, client); expand row for line items (freight, customs, insurance, etc.); update payment status (partial/paid/overdue) via API; totals consistent (`paid_amount` vs `total`). |
| **QA expectations** | `GET /api/finance` consistent rules: paid → `paid_amount = total`; partial → `0 < paid < total`; unpaid/overdue → `paid = 0`; status change persists; debt/overdue cards update. |

**Demo note:** Mark as paid / partial is in scope; bank settlement is not (see §3).

---

### 2.7 Excel export / import

| Item | Detail |
|------|--------|
| **Demo intent** | Prove data can leave and re-enter the system for ops (shipments or finance extract). |
| **Minimum behavior** | **Export:** download `.xlsx` (or `.csv` if agreed) for shipments list and/or finance table with column headers matching UI labels (Russian headers acceptable). **Import:** upload file, preview errors, commit valid rows (define minimum: shipments **or** clients — document chosen scope in implementation task). |
| **QA expectations** | Export opens in Excel/Numbers; round-trip: export → edit one row → import updates DB; invalid rows reported without corrupting DB; charset and dates correct. |

**Known MVP gap:** not implemented; UI placeholders must not be demoed until done.

---

### 2.8 Location autocomplete

| Item | Detail |
|------|--------|
| **Demo intent** | Fast, consistent city/route entry on shipment and checkpoint forms. |
| **Minimum behavior** | Typeahead on **Откуда**, **Куда**, and checkpoint city fields; suggestions from curated list and/or geocoding provider (implementation choice); selecting suggestion fills normalized city label stored in API. |
| **QA expectations** | Partial string returns suggestions; keyboard/mouse select works; free-text still allowed with validation message if unknown; no duplicate conflicting spellings for same city in one demo session. |

**Known MVP gap:** free-text cities and quick-pick chips only.

---

### 2.9 Units and validation (weight / volume)

| Item | Detail |
|------|--------|
| **Demo intent** | Credible cargo dimensions for pricing and ops. |
| **Minimum behavior** | Weight default unit **kg**; volume default unit **m³**; labels visible on forms; validation: positive numbers, max reasonable bounds, required-or-optional per field rules; block submit with inline errors. |
| **QA expectations** | Invalid (negative, text, empty required) shows error, no API call; valid values persist on create/edit and display formatted on detail (see §2.10). |

---

### 2.10 Number formatting (large values)

| Item | Detail |
|------|--------|
| **Demo intent** | Finance and KPI numbers readable in RU locale (thousands separators, currency). |
| **Minimum behavior** | Display amounts with grouping (e.g. `1 234 567 ₸` or agreed currency symbol); input may accept unformatted digits; store numeric in API; dashboard and finance tables use consistent formatter. |
| **QA expectations** | Values ≥ 1 000 000 render with separators; no scientific notation in UI; edit forms do not strip precision incorrectly. |

---

## 3. Explicitly out of scope (MVP+ demo)

Do **not** promise or demo these in the MVP+ client meeting unless a separate task explicitly adds them.

| Area | Reason |
|------|--------|
| **Auth / login** | No session, JWT, or SSO — shared demo URL remains valid. |
| **Roles / permissions** | No manager vs client vs admin enforcement; sidebar remains fully visible. |
| **Real payment gateway** | Finance is operational status and amounts, not card/bank capture. |
| **Real Telegram message delivery** | Settings persist; no live bot send to client channels. |
| **PDF generation** | Out unless already implemented and QA-passed; current Finance PDF/download is **not** safe to demo. |
| **Full Users backend** | Users page stays mock/local; no `PlatformUser` CRUD API for MVP+. |
| **Archive module** | Not required for MVP+ storyline. |
| **Company profile (Settings)** | Placeholder branding — optional mention only. |
| **1C / bank / ERP integration** | Future phase. |
| **Multi-tenant / white-label** | Future phase. |
| **Mobile app / client portal** | Future phase. |

---

## 4. Implementation order

Recommended sequence for engineering tasks (each should be small PRs + `npm run build` + `php artisan test` where backend changes apply).

| Order | Work package | Depends on | Unblocks demo step |
|-------|----------------|------------|-------------------|
| 1 | **API reliability** — visible offline indicator; no silent mock fallback in production (FIX-API-FALLBACK-001) | — | All flows |
| 2 | **Checkpoint UX fix** — modal overlay (FIX-TRACKING-MODAL-001) | — | §2.3 |
| 3 | **Shipment update + delete** API + UI; tracking number policy (FIX-TRACKING-NUMBER-001) | — | §2.2 |
| 4 | **Clients CRUD** API + UI (partners) | — | §2.5, shipment forms |
| 5 | **Managers CRUD** API + UI; nav entry | — | §2.4, shipment forms |
| 6 | **Checkpoint delete** API + UI | 2 | §2.3 |
| 7 | **Units + validation** on shipment forms | 3 | §2.9 |
| 8 | **Number formatting** (dashboard, finance, shipment detail) | — | §2.10 |
| 9 | **Location autocomplete** on route/checkpoint fields | 4–5 optional | §2.8 |
| 10 | **Finance reports polish** — filters, expand rows, status rules | — | §2.6 |
| 11 | **Excel export** (shipments + finance) | 3, 10 | §2.7 export |
| 12 | **Excel import** (agreed entity) | 11 | §2.7 import |
| 13 | **Dashboard refresh** — verify KPIs after CRUD smoke | 3–10 | §2.1 |
| 14 | **MVP+ demo script** — update `DEMO_SCRIPT.md` or add `DEMO_SCRIPT_PLUS.md` | 1–13 | Rehearsal |
| 15 | **QA regression pack** — automated smoke against staging/production | 1–13 | Pre-demo checklist |

**Parallelizable:** 7–8 with 4–5 after order 3 is merged.

---

## 5. QA matrix (pre-demo gate)

Use this checklist **before** the MVP+ client demo (extend [DEMO_SCRIPT.md](DEMO_SCRIPT.md) §1).

| # | Flow | Pass criteria |
|---|------|----------------|
| 1 | Health / CORS | `GET /api/health` → `ok`; no CORS errors on Vercel origin |
| 2 | Dashboard | KPIs load; numbers match spot-check on shipments/finance |
| 3 | Shipment create | New tracking number; list + detail OK |
| 4 | Shipment edit | Field change persists after refresh |
| 5 | Shipment delete | Row removed; checkpoints gone; tracking number policy verified |
| 6 | Checkpoint add/edit/delete | Full UI path without overlay block |
| 7 | Manager CRUD | Create → assign on shipment; delete rules OK |
| 8 | Client CRUD | Create → assign on shipment; delete rules OK |
| 9 | Finance | Status change + consistent paid/total rules |
| 10 | Excel export | File opens; columns match UI |
| 11 | Excel import | Valid file commits; invalid file rejected cleanly |
| 12 | Autocomplete | Select city on shipment + checkpoint |
| 13 | Validation | Invalid weight/volume blocked with message |
| 14 | Formatting | Large amounts display with grouping |
| 15 | Out of scope | Users/Archive/PDF/auth not shown unless stakeholder asks |

**Database hygiene:** Run cleanup/verify tasks (DB-CLEANUP-*, DB-VERIFY-*) so demo DB has no QA/Test rows before the meeting.

---

## 6. API surface (target — not current)

Current API is read-heavy plus create shipment, checkpoint add/update, finance status, telegram settings. MVP+ **requires new endpoints** (exact paths defined in implementation tasks), for example:

| Resource | Methods (target) |
|----------|------------------|
| Shipments | `PATCH`, `DELETE` on `/api/shipments/{id}` |
| Checkpoints | `DELETE` on `/api/checkpoints/{id}` |
| Clients | `GET`, `POST`, `PATCH`, `DELETE` `/api/clients` |
| Managers | `POST`, `PATCH`, `DELETE` `/api/managers` |
| Export | `GET` `/api/shipments/export`, `/api/finance/export` (or query params) |
| Import | `POST` `/api/shipments/import`, etc. |

Until implemented, treat rows in §2 as **specification**, not live behavior.

---

## 7. Success criteria for SCOPE-MVP-PLUS-001

- [x] `docs/MVP_PLUS_SCOPE.md` defines flows, out-of-scope, implementation order, and QA expectations.
- [x] `README.md` links to this document.
- [ ] Product code, backend, and database unchanged by this task.

---

## 8. References

| Document | Role |
|----------|------|
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | Current MVP stakeholder walkthrough |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Historical frontend/backend phasing |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Repo boundaries and stack |
| [README.md](../README.md) | Deploy URLs and API table |

---

*Last updated: SCOPE-MVP-PLUS-001 — documentation-only scope for MVP+ client demo.*
