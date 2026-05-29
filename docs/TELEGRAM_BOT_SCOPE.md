# Telegram Bot MVP — Scope Definition

**Task:** TELEGRAM-BOT-SCOPE-001  
**Status:** MVP implemented on `feature/telegram-bot-mvp` (sends, status, test message, frontend wiring). Webhook and account-scoped journal are follow-on.
**Last updated:** 2026-05-22

## Purpose

Define the minimum viable scope for real Telegram Bot API integration in the Logistics MVP+ project.

**Per-user/account notification settings and journal** are specified in [TELEGRAM_ACCOUNT_ARCHITECTURE.md](./TELEGRAM_ACCOUNT_ARCHITECTURE.md) (corrected by TELEGRAM-ARCHITECTURE-CORRECTION-001: **one global bot token**, per principal chat id and logs).

This document remains the contract for bot sends, env vars, endpoints, and production rollout.

---

## Current state (baseline)

| Layer | What exists today |
|-------|-------------------|
| **Database** | Legacy `telegram_settings`; evolving `telegram_notification_settings` per account (see architecture doc). **Target: no token in DB.** |
| **Backend API** | `GET/PATCH /api/telegram/settings`, `GET /api/telegram/status`, `POST /api/telegram/test-message`, `GET /api/telegram/notifications` |
| **Token** | **Target:** `TELEGRAM_BOT_TOKEN` env only. Frontend never shows or accepts token. Legacy DB/masked token paths to be removed. |
| **Shipments** | `telegram_notifications` boolean on create; per-shipment flag in UI |
| **Event flags** | Used by `TelegramBotService::shouldNotifyForShipment` for automated sends |
| **Frontend** | `src/pages/Telegram.tsx` — status badge, save settings, real test message API, toggles |
| **Sending** | `TelegramBotService` — shipment created, status changed, checkpoint added |
| **Journal** | `GET /api/telegram/notifications` + UI journal (per principal); see architecture doc |
| **Webhook** | Not implemented |

---

## 1. In scope (MVP)

### 1.1 Secure storage of bot and user settings

- **Bot token (global):** `TELEGRAM_BOT_TOKEN` in backend environment **only**. Never in frontend, never in PostgreSQL, never in API JSON.
- **Per user/account (target):** `telegram_chat_id`, optional `telegram_username`, `enabled`, notification toggles — see [TELEGRAM_ACCOUNT_ARCHITECTURE.md](./TELEGRAM_ACCOUNT_ARCHITECTURE.md).
- **Not allowed:** per-account bot token, `PATCH` with `botToken`, or encrypted token columns in DB.
- **Legacy (to remove):** `telegram_settings.bot_token`, `telegram_bot_configs.bot_token_encrypted` — implementation drift; do not extend.
- **Optional env:** `TELEGRAM_DEFAULT_CHAT_ID` for ops bootstrap only; each user should still save their own chat id in settings.

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

- API must **not** return `botToken` (masked or otherwise).
- API must **not** accept `botToken` on `PATCH` (reject or ignore).
- Status API uses `configured: boolean` (true when env token is set).
- Logs and application logging must redact any token-like values.

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
| Multiple bot tokens per tenant | **Out of scope** — one global bot only |
| Per-user chat settings + journal | See [TELEGRAM_ACCOUNT_ARCHITECTURE.md](./TELEGRAM_ACCOUNT_ARCHITECTURE.md) |
| Editing messages or deleting sent messages | Not needed |
| Rate-limit handling beyond basic logging | Document for ops; no dedicated worker in MVP |

---

## 3. Required environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | **Yes** (production) | **Only** bot identity for the whole app. From [@BotFather](https://t.me/BotFather). Not stored in DB. |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended (prod) | Random string; set as Telegram webhook `secret_token` and validate on `POST /api/telegram/webhook`. |
| `TELEGRAM_WEBHOOK_URL` | Optional | Full public URL for webhook registration helper (e.g. `https://logistics-mvp.onrender.com/api/telegram/webhook`). Can be derived from `APP_URL`. |
| `TELEGRAM_DEFAULT_CHAT_ID` | Optional | Ops/bootstrap fallback only. Per-user chat id lives in notification settings table. |

**Not in frontend `.env`:** no `VITE_TELEGRAM_*` variables.

**Render / local:** set in backend environment only; never commit values.

---

## 4. Backend endpoints

### 4.1 Existing (keep)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/telegram/settings` | Load masked settings + shipments with `telegram_notifications: true` |
| `PATCH` | `/api/telegram/settings` | Update personal chat ID, username, toggles — **no `botToken`**; scoped to current user/account |
| `GET` | `/api/telegram/notifications` | Own notification journal only (all authenticated roles) |
| `POST` | `/api/telegram/test-message` | Test send to current user's chat ID (all authenticated roles) |

**Personal settings (TELEGRAM-PERSONAL-SETTINGS-001):** Every authenticated role (`admin`, `manager`, `operator`, `finance`, `viewer`) may read/write **own** `telegram_notification_settings` and **own** journal rows. System `TELEGRAM_BOT_TOKEN` stays env-only; `botToken` in PATCH body is **prohibited** (422).

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

| UI area | Behavior |
|---------|----------|
| Token | **Not shown, not editable** — status badge reflects env `configured` only |
| Chat ID field | Saved via `PATCH` per current principal |
| Telegram username | Optional display/edit when API supports it |
| Connected toggle | Saves immediately; when off, backend skips sends for that principal |
| Event type toggles | Save via `PATCH`; backend respects flags |
| Test message | `POST /api/telegram/test-message` via global bot |
| Notification journal | `GET /api/telegram/notifications` — per principal history |
| Shipments list | Live from API — shipments with notifications enabled |

**Shipment create** (`Shipments.tsx`): keep `Telegram-уведомления` checkbox; value already persisted as `telegramNotifications`.

**No frontend direct calls** to `api.telegram.org`.

---

## 6. QA checklist

### Local

- [ ] Backend has valid `TELEGRAM_BOT_TOKEN` and test `chat_id` in DB or env.
- [ ] `GET /api/telegram/settings` — no `botToken` field in response.
- [ ] `PATCH /api/telegram/settings` — update chat ID and flags; `botToken` ignored/rejected.
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
| `TELEGRAM-ACCOUNT-SCOPE-001` | User/account notification architecture doc | Done |
| `TELEGRAM-ARCHITECTURE-CORRECTION-001` | Doc: one global token, per-user chat + logs | Done |
| `TELEGRAM-TOKEN-CLEANUP-001` | Code: env-only token; remove DB token paths | Planned |
| `TELEGRAM-SETTINGS-RENAME-001` | Settings table without token column | Planned |
| `TELEGRAM-NOTIFICATION-LOG-001` | Journal API + logging | Done |
| `TELEGRAM-FRONTEND-JOURNAL-001` | Journal UI | Done |
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
