# Telegram Bot MVP — Scope Definition

**Task:** TELEGRAM-BOT-SCOPE-001  
**Status:** MVP implemented on `feature/telegram-bot-mvp` (sends, status, test message, frontend wiring). Webhook and account-scoped journal are follow-on.
**Last updated:** 2026-05-22

## Purpose

Define the minimum viable scope for real Telegram Bot API integration in the Logistics MVP+ project.

**Account-specific config and notification journal** are specified in [TELEGRAM_ACCOUNT_ARCHITECTURE.md](./TELEGRAM_ACCOUNT_ARCHITECTURE.md) (Default Demo Account now; multi-account when auth exists).

This document remains the contract for bot sends, env vars, endpoints, and production rollout. Use the account architecture doc for DB shape, journal API, and future tenancy.

---

## Current state (baseline)

| Layer | What exists today |
|-------|-------------------|
| **Database** | `telegram_settings` table: `bot_token` (encrypted cast), `chat_id`, `connected`, `event_flags` (JSON). **No `account_id` yet** — see account architecture doc. |
| **Backend API** | `GET/PATCH /api/telegram/settings`, `GET /api/telegram/status`, `POST /api/telegram/test-message` |
| **Token exposure** | `GET` may return masked token (`••••••••••••`) or omit in future; env token never exposed. Frontend **does not** collect token (server env only). |
| **Shipments** | `telegram_notifications` boolean on create; per-shipment flag in UI |
| **Event flags** | Used by `TelegramBotService::shouldNotifyForShipment` for automated sends |
| **Frontend** | `src/pages/Telegram.tsx` — status badge, save settings, real test message API, toggles |
| **Sending** | `TelegramBotService` — shipment created, status changed, checkpoint added |
| **Journal** | Static mock rows in UI — **not persisted**; target: `telegram_notification_logs` per account architecture |
| **Webhook** | Not implemented |

---

## 1. In scope (MVP)

### 1.1 Secure storage of bot settings

- **Bot token** must live **server-side only** (never in frontend bundles, never in API responses as plaintext).
- **Storage model (MVP):**
  - **Primary:** `TELEGRAM_BOT_TOKEN` in backend environment (Render/local `.env`) for default/production bot identity.
  - **Optional override:** `telegram_settings.bot_token` in PostgreSQL when an admin updates token via settings UI (write-only from API; read always masked).
- **Chat target:** `telegram_settings.chat_id` (group/channel/user ID for outbound notifications).
- **Operational flags:** `connected`, `event_flags` (which notification types are enabled).
- **At rest:** `bot_token` uses Laravel `encrypted` cast on `TelegramSetting`. Env `TELEGRAM_BOT_TOKEN` is never returned to clients.
- **Per account (future):** one `telegram_bot_configs` row per account — see [TELEGRAM_ACCOUNT_ARCHITECTURE.md](./TELEGRAM_ACCOUNT_ARCHITECTURE.md).

### 1.2 Send test message from Telegram settings page

- New backend action triggered from UI: admin enters optional custom text (or default template), backend calls Telegram `sendMessage` to configured `chat_id`.
- UI must show **real** success/error (replace demo toast).
- Failures return JSON with Russian user-facing message (consistent with existing API error handling).

### 1.3 Shipment created notification

- When `POST /api/shipments` succeeds **and** global settings allow `departure` **and** shipment has `telegram_notifications: true` (or global policy: all shipments — **decision: respect per-shipment flag**), send one message to `chat_id`.
- Message includes: tracking number, origin → destination, client name, optional manager name.

### 1.4 Shipment status change notification

- When `PATCH /api/shipments/{id}/status` succeeds, send notification if:
  - `connected` is true,
  - relevant `event_flags` match mapped status (e.g. `in_transit` → departure/in-transit, `delivered` → `delivery`, `delayed` → `delay`),
  - shipment `telegram_notifications` is true.
- Message includes: tracking number, old/new status (Russian labels), optional status note.

### 1.5 Tracking checkpoint added notification

- When `POST /api/shipments/{id}/checkpoints` succeeds, send if `event_flags.checkpoint` is enabled and shipment notifications are on.
- Message includes: tracking number, checkpoint city/address, planned time, status.

### 1.6 Optional webhook for simple commands

- **Endpoint:** `POST /api/telegram/webhook` (Telegram Bot API webhook URL pointed at this route).
- **Commands (MVP):**
  - `/start` — welcome + short help
  - `/help` — list available commands
  - `/track <tracking_number>` — reply with shipment summary (status, route, last checkpoint) or “not found”
- **Security:** validate `X-Telegram-Bot-Api-Secret-Token` header when `TELEGRAM_WEBHOOK_SECRET` is set; reject unsigned requests in production.
- **No** multi-tenant chat routing, no user registration, no subscription opt-in flows.

### 1.7 Token never exposed to frontend

- API responses continue to return `botToken: "••••••••••••"` or `null` only.
- Frontend may collect a **new** token on save (`PATCH` body); it must not echo back after save.
- Logs must redact token values.

### 1.8 Explicit non-goals in MVP (reminder)

- No auth/roles for bot admin actions.
- No per-customer Telegram subscription or opt-in database.
- No payment/docs notification automation beyond flag storage (flags exist; sending for `payment`/`docs` is **out of scope** unless listed below).

---

## 2. Out of scope (MVP)

| Item | Reason |
|------|--------|
| User/auth/roles for Telegram admin | Deferred; same as rest of MVP+ admin UI |
| Per-client or per-manager DM subscriptions | Complex product logic; single `chat_id` broadcast is enough for demo |
| Inline keyboards, media, document upload | Not required for logistics notifications |
| Finance invoice/payment Telegram alerts | `payment` flag stored but **not sent** in MVP |
| Document request alerts | `docs` flag stored but **not sent** in MVP |
| Telegram login widget / OAuth | Not needed |
| Message delivery receipts / read analytics | Optional later |
| Retry queue with dead-letter (Redis/Horizon) | MVP: synchronous send with try/catch + log; failed send must not break API mutation |
| Multi-bot / multi-tenant | Single settings row (`first()`) until account architecture is implemented |
| Account-scoped config + notification journal | See [TELEGRAM_ACCOUNT_ARCHITECTURE.md](./TELEGRAM_ACCOUNT_ARCHITECTURE.md) |
| Editing messages or deleting sent messages | Not needed |
| Rate-limit handling beyond basic logging | Document for ops; no dedicated worker in MVP |

---

## 3. Required environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | **Yes** (production) | Bot token from [@BotFather](https://t.me/BotFather). Used when DB token is empty or as bootstrap default. |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended (prod) | Random string; set as Telegram webhook `secret_token` and validate on `POST /api/telegram/webhook`. |
| `TELEGRAM_WEBHOOK_URL` | Optional | Full public URL for webhook registration helper (e.g. `https://logistics-mvp.onrender.com/api/telegram/webhook`). Can be derived from `APP_URL`. |
| `TELEGRAM_DEFAULT_CHAT_ID` | Optional | Fallback `chat_id` if DB row empty (useful for first deploy before UI save). |

**Not in frontend `.env`:** no `VITE_TELEGRAM_*` variables.

**Render / local:** set in backend environment only; never commit values.

---

## 4. Backend endpoints

### 4.1 Existing (keep)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/telegram/settings` | Load masked settings + shipments with `telegram_notifications: true` |
| `PATCH` | `/api/telegram/settings` | Update `chatId`, `connected`, `eventFlags`, optional new `botToken` |

### 4.2 New (MVP)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/telegram/test` | Send test message to configured `chat_id`. Body: `{ "message": "optional text" }`. Returns `{ "sent": true }` or 422/502 with error. |
| `POST` | `/api/telegram/webhook` | Telegram update webhook for `/start`, `/help`, `/track`. No auth middleware; validate secret header. |

### 4.3 Internal (not public HTTP)

| Trigger | Service action |
|---------|----------------|
| Shipment created | `TelegramNotifier::shipmentCreated($shipment)` |
| Shipment status updated | `TelegramNotifier::shipmentStatusChanged($shipment, $from, $to, $note)` |
| Checkpoint created | `TelegramNotifier::checkpointAdded($shipment, $checkpoint)` |

Implementation note: call notifier **after** DB commit; swallow Telegram API errors so the primary API response still succeeds (log error server-side).

### 4.4 Telegram Bot API usage

- `POST https://api.telegram.org/bot<token>/sendMessage` — all outbound notifications and test send.
- `POST https://api.telegram.org/bot<token>/setWebhook` — one-time or deploy script to register webhook URL (ops checklist, not necessarily UI).

---

## 5. Frontend UI behavior

**Page:** `Telegram-бот` (`src/pages/Telegram.tsx`)

| UI area | Current | MVP target |
|---------|---------|------------|
| Bot Token field | User can type token; sent on save via `PATCH` | Keep; placeholder explains “leave empty to keep existing”. Never display returned token except mask. |
| Chat ID field | Saved via `PATCH` | Keep |
| Connected toggle | Saves immediately | Keep; when `connected: false`, backend skips all sends |
| Event type toggles | Save via `PATCH` | Keep; backend respects flags for automated sends |
| **Test message** | Real API | `POST /api/telegram/test-message`; success/error in Russian |
| Notification log panel | Static mock rows | **Follow-on:** `GET /api/telegram/notifications` + account-scoped log table (see account architecture) |
| Bot token field | Removed | Configured badge only; token server-side env/DB |
| Shipments list | Live from API | Keep — shows shipments with notifications enabled |

**Shipment create** (`Shipments.tsx`): keep `Telegram-уведомления` checkbox; value already persisted as `telegramNotifications`.

**No frontend direct calls** to `api.telegram.org`.

---

## 6. QA checklist

### Local

- [ ] Backend has valid `TELEGRAM_BOT_TOKEN` and test `chat_id` in DB or env.
- [ ] `GET /api/telegram/settings` — `botToken` is masked, never full token.
- [ ] `PATCH /api/telegram/settings` — update chat ID and flags; token unchanged when field empty.
- [ ] `POST /api/telegram/test` — message appears in Telegram chat; UI shows success.
- [ ] `POST /api/telegram/test` with `connected: false` — returns clear error, no send.
- [ ] Create shipment with `telegramNotifications: true` — Telegram message received (if `departure` on).
- [ ] Create shipment with `telegramNotifications: false` — no message.
- [ ] `PATCH /api/shipments/{id}/status` — message on status change when flag mapping matches.
- [ ] `POST /api/shipments/{id}/checkpoints` — checkpoint message when `checkpoint` flag on.
- [ ] Invalid token — API mutation still succeeds; error logged; optional warning in logs only.
- [ ] Webhook: `POST /api/telegram/webhook` with `/start`, `/help`, `/track LGX-2026-0421` — correct replies.
- [ ] Webhook with wrong secret — 403 in production when secret configured.
- [ ] Frontend: test button no longer shows “демо, без реального API”.
- [ ] Browser network tab: no requests to `api.telegram.org`; no token in responses.

### Regression

- [ ] `php artisan test` — new feature tests for telegram send (mock HTTP).
- [ ] Existing `UpdateTelegramSettingsApiTest` still passes.
- [ ] CORS unchanged for Telegram routes.

---

## 7. Production deployment checklist

### Render (backend)

- [ ] Set `TELEGRAM_BOT_TOKEN` in Render environment (secret).
- [ ] Set `TELEGRAM_WEBHOOK_SECRET` (random 32+ chars).
- [ ] Optionally set `TELEGRAM_DEFAULT_CHAT_ID` for first boot.
- [ ] Confirm `APP_URL=https://logistics-mvp.onrender.com` (or actual service URL).
- [ ] Register webhook once:
  ```bash
  curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
    -d "url=https://logistics-mvp.onrender.com/api/telegram/webhook" \
    -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
  ```
- [ ] `RUN_SEEDERS=false` after initial demo seed (do not overwrite `telegram_settings` on restart).
- [ ] `RUN_MIGRATIONS=true` so `telegram_settings` table exists.

### Vercel (frontend)

- [ ] No Telegram secrets in Vercel env.
- [ ] `VITE_API_BASE_URL` points to Render `/api`.

### Smoke (production)

- [ ] Open Telegram page → save chat ID → send test message → received in chat.
- [ ] Create demo shipment with notifications → one Telegram message.
- [ ] Send `/track <valid_tracking>` to bot → summary reply.
- [ ] Verify logs on Render do not contain full bot token.

### Rollback

- [ ] Set `connected: false` via UI or DB to disable sends without redeploy.
- [ ] Remove webhook via `deleteWebhook` if bot must be silenced completely.

---

## 8. Event flag → notification mapping (MVP)

| `event_flags` key | Send when |
|-------------------|-----------|
| `departure` | Shipment created (and optionally first `planned` → `in_transit` if desired — **default: create only**) |
| `checkpoint` | Checkpoint added |
| `delay` | Status → `delayed` |
| `delivery` | Status → `delivered` |
| `customs` | **Optional MVP:** checkpoint note contains “таможн” or dedicated status — **default: skip unless explicit rule added** |
| `payment` | **Out of scope** |
| `docs` | **Out of scope** |

---

## 9. Suggested implementation tasks (follow-on)

| Task ID | Description | Status |
|---------|-------------|--------|
| `TELEGRAM-BOT-BACKEND-001` | `TelegramBotService` + tests | Done |
| `TELEGRAM-BOT-API-001` | Status + test-message endpoints | Done |
| `TELEGRAM-BOT-EVENTS-001` | Wire shipment/checkpoint notifications | Done |
| `TELEGRAM-BOT-FRONTEND-001` | Real test message UI | Done |
| `TELEGRAM-ACCOUNT-SCOPE-001` | Account architecture doc | Done |
| `TELEGRAM-ACCOUNT-DB-001` | `accounts` + `telegram_bot_configs` + logs migration | Planned |
| `TELEGRAM-ACCOUNT-UI-001` | Live notification journal | Planned |
| `TELEGRAM-WEBHOOK-001` | Webhook controller + `/start`, `/help`, `/track` | Planned |
| `TELEGRAM-PROD-001` | Webhook registration + production smoke | Planned |

---

## 10. References

- Account architecture: `docs/TELEGRAM_ACCOUNT_ARCHITECTURE.md`
- Existing UI: `src/pages/Telegram.tsx`
- API types: `src/types/api.ts` (`TelegramSettings`, `TelegramEventFlags`)
- Backend: `backend/app/Http/Controllers/Api/TelegramSettingController.php`
- Routes: `backend/routes/api.php`
- Table: `backend/database/migrations/2026_05_20_100006_create_telegram_settings_table.php`
- Demo seed: `backend/database/seeders/TelegramSettingSeeder.php`
