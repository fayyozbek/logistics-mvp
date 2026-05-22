# Account-Specific Telegram Bot Architecture

**Task:** TELEGRAM-ACCOUNT-SCOPE-001  
**Status:** Architecture documentation (implementation not started)  
**Last updated:** 2026-05-22

## Purpose

Define a **future-ready** architecture for Telegram bot configuration and notification logging that:

- Works today with a single **Default Demo Account** (no auth required).
- Scales later to **one bot + chat settings per account/workspace** when users and authentication exist.
- Keeps **bot tokens server-side only** and **never exposes secrets** to the frontend.

This document is the contract for follow-on tasks: notification journal, account-scoped settings, and auth integration.

**Related:** [TELEGRAM_BOT_SCOPE.md](./TELEGRAM_BOT_SCOPE.md) (MVP send/test/status scope, largely implemented on `feature/telegram-bot-mvp`).

---

## 1. Concepts

### 1.1 Account (workspace)

An **account** is the top-level tenant boundary for logistics data and integrations.

| Concept | Description |
|---------|-------------|
| **Account** | Owns shipments, clients, managers, finance, and Telegram configuration. |
| **Default Demo Account** | Single fixed account used until real auth exists. All current API traffic resolves to this account. |
| **Future account** | Created when a customer signs up; has its own bot token, chat ID, toggles, and notification log. |

**Naming in code (recommended):** `Account` model, table `accounts`, slug `default-demo` for the MVP row.

### 1.2 Telegram bot configuration (per account)

Each account has **at most one active Telegram integration config** in MVP+ (extensible to multiple channels later).

| Field | Stored | Returned to frontend |
|-------|--------|----------------------|
| `bot_token` | DB (encrypted) and/or env fallback | **Never** — only `configured: true/false` |
| `bot_username` | DB (from Bot API `getMe` after setup) or cache | **Yes** — public identifier |
| `chat_id` | DB | **Yes** |
| `connected` / `enabled` | DB | **Yes** |
| `event_flags` | DB JSON | **Yes** |
| `last_test_at`, `last_test_status`, `last_test_message` | DB | **Yes** — short status only, no secrets |

### 1.3 Notification log (per account)

Every outbound Telegram attempt (automated or test) creates a **notification log row** scoped to the account (and optionally linked to shipment/checkpoint).

---

## 2. Current state vs target

### 2.1 Today (implemented on feature branch)

| Piece | Current behavior |
|-------|------------------|
| Settings table | Single row `telegram_settings` (no `account_id`) |
| Token | `encrypted` cast on `bot_token`; masked in API as `••••••••••••` |
| Status API | `GET /api/telegram/status` — safe fields only |
| Test message | `POST /api/telegram/test-message` |
| Event sends | Shipment create, status change, checkpoint add (gated by flags) |
| UI journal | **Static mock** rows in `Telegram.tsx` — not persisted |
| Auth | None — implicit single tenant |

### 2.2 Target (account-ready)

| Piece | Target behavior |
|-------|------------------|
| `accounts` table | At least one row: Default Demo Account |
| `telegram_bot_configs` | One row per account (replaces or wraps `telegram_settings`) |
| `telegram_notification_logs` | Append-only log per send attempt |
| API resolution | `CurrentAccount::resolve()` → default demo until auth |
| UI journal | Live data from `GET /api/telegram/notifications` (paginated) |
| Frontend token field | **Removed** — token env-only or one-time setup API (see §5) |

---

## 3. Data model (target schema)

### 3.1 `accounts`

```text
accounts
  id              bigint PK
  slug            string unique   -- e.g. "default-demo"
  name            string          -- "Default Demo Account"
  is_active       boolean
  created_at, updated_at
```

**MVP seed:** one row `slug = default-demo`, `name = Default Demo Account`.

### 3.2 `telegram_bot_configs`

One config per account (unique `account_id`).

```text
telegram_bot_configs
  id                    bigint PK
  account_id            bigint FK → accounts, unique
  bot_token             text nullable, encrypted at rest
  bot_username          string nullable   -- @MyBot, from getMe
  chat_id               string nullable
  connected             boolean default false
  event_flags           json nullable
  last_test_at          timestamp nullable
  last_test_status      enum: success|failed|skipped nullable
  last_test_error       string nullable   -- short, no token
  created_at, updated_at
```

**Token resolution order (unchanged from MVP):**

1. `telegram_bot_configs.bot_token` for current account (decrypted server-side only).
2. Else `TELEGRAM_BOT_TOKEN` env (bootstrap / single-tenant deploy).
3. Else not configured.

**Never** store env token in API responses or logs.

### 3.3 `telegram_notification_logs`

```text
telegram_notification_logs
  id                bigint PK
  account_id        bigint FK → accounts
  telegram_bot_config_id  bigint FK nullable
  event_type        string   -- test_message | shipment_created | status_changed | checkpoint_added | ...
  status            enum: sent | failed | skipped
  shipment_id       bigint FK nullable
  checkpoint_id     bigint FK nullable
  tracking_number   string nullable   -- denormalized for journal display
  message_preview   string nullable   -- first ~200 chars of text sent (no token)
  error_message     string nullable   -- short user-safe error
  telegram_message_id bigint nullable
  created_at        timestamp
```

**Indexes:** `(account_id, created_at DESC)`, optional `(shipment_id)`.

**`skipped` examples:** `connected: false`, event flag off, `telegram_notifications: false` on shipment — log optional but recommended for support/debug.

---

## 4. API design (account-scoped)

Until auth exists, all routes implicitly use **Default Demo Account** via middleware or `AccountContext::default()`.

### 4.1 Settings and status (evolve existing)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/telegram/settings` | Resolve config for current account; **no `botToken` in response** — use `configured` + `botUsername` |
| `PATCH` | `/api/telegram/settings` | Update `chatId`, `connected`, `eventFlags`; optional **one-time** `botToken` write (never echoed) |
| `GET` | `/api/telegram/status` | `configured`, `enabled`, `hasChatId`, `notificationsEnabled`, `botTokenSource` (`env` \| `db` \| null), `botUsername`, `lastTestStatus` |

**Breaking change (intentional, phased):** remove `botToken` masked field from JSON; replace with `configured: boolean` and `botUsername: string | null`.

### 4.2 Test message

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/api/telegram/test-message` | Send test; update `last_test_*` on config; append log row `event_type=test_message` |

### 4.3 Notification journal (new)

| Method | Path | Query | Response |
|--------|------|-------|----------|
| `GET` | `/api/telegram/notifications` | `?page=1&limit=50&eventType=&status=` | Paginated log rows for current account |

**Row shape (safe):**

```json
{
  "id": "1",
  "eventType": "checkpoint_added",
  "status": "sent",
  "trackingNumber": "LGX-2026-0498",
  "shipmentId": "2",
  "checkpointId": "14",
  "messagePreview": "📍 Новая точка маршрута: LGX-2026-0498...",
  "errorMessage": null,
  "createdAt": "2026-05-22T10:15:00Z"
}
```

### 4.4 Internal: logging on every send

`TelegramBotService` (or dedicated `TelegramNotificationLogger`) after each attempt:

1. Resolve `account_id` from current context.
2. Insert `telegram_notification_logs` with outcome.
3. On test send, update `last_test_*` on config.

Failures must **not** roll back the primary logistics transaction.

---

## 5. Security rules (non-negotiable)

| Rule | Implementation |
|------|----------------|
| Token encrypted in DB | Laravel `encrypted` cast on `bot_token` (already on `TelegramSetting`) |
| Token never in GET responses | Omit field; return `configured` + `botUsername` only |
| Token never in logs | Redact in Monolog/context; tests assert no leak |
| Frontend never displays token | No token input in production UI; setup via server env or admin-only endpoint |
| PATCH accepts token once | Only non-empty, non-masked value; store encrypted; response without token |
| `botTokenSource` in status | May be `env` or `db`; never include token value |
| Journal errors | Short message only; no Telegram API raw body with secrets |

**MVP UI alignment (TELEGRAM-BOT-FRONTEND-001):** token input removed; status badge shows configured/not configured. Account architecture keeps that direction.

---

## 6. Frontend UI (account-aware)

**Page:** `Telegram-бот` (`src/pages/Telegram.tsx`)

### 6.1 Bot configuration card (safe fields only)

| UI element | Data source |
|------------|-------------|
| Configured badge | `GET /api/telegram/status` → `configured` |
| Bot username | `status.botUsername` or settings (e.g. `@LogistixNotifyBot`) |
| Chat ID input | `settings.chatId` |
| Connected toggle | `settings.connected` / `status.enabled` |
| Notification toggles | `settings.eventFlags` |
| Last test status | `status.lastTestStatus` + timestamp (optional) |
| Send test button | `POST /api/telegram/test-message` |

**Must not show:** bot token, token preview, env variable names in production UI (dev docs OK).

### 6.2 Notification journal panel

Replace static `mockLogs` with API-driven list:

| Column | Source |
|--------|--------|
| Event type | `eventType` → Russian label map |
| Related shipment | `trackingNumber` + link if shipment UI exists |
| Status | `sent` / `failed` / `skipped` — color dot |
| Time | `createdAt` (localized) |
| Error | `errorMessage` when `failed` |

Empty state: «Уведомлений пока нет».

---

## 7. Account resolution (no auth yet)

```text
Request → ApiAccountMiddleware
            → AccountContext::current()
                 → if authenticated (future): user.account_id
                 → else: Account::where('slug', 'default-demo')->first()
            → bind in container for request lifetime
```

**All** Telegram and logistics writes that need tenancy should use `account_id` from context (future). MVP migration can add `account_id` to new tables with default FK to demo account; existing shipment rows get backfilled to demo account in one migration.

**Do not implement** login, JWT, or roles in the account-scoped Telegram tasks unless a separate auth task is approved.

---

## 8. Future auth integration

| Phase | Behavior |
|-------|----------|
| **Now** | Single Default Demo Account; no login |
| **Auth phase 1** | Users table + `users.account_id`; session or token identifies user |
| **Auth phase 2** | API middleware sets `AccountContext` from `auth()->user()->account_id` |
| **Auth phase 3** | Account admin can rotate bot token via PATCH; invite users per account |
| **Multi-workspace (later)** | User belongs to many accounts; switcher in UI; Telegram config per account |

**Telegram-specific:** each account may register a different `@BotFather` bot and chat. Webhook URL may include account slug: `/api/telegram/webhook/{accountSlug}` with secret validation per config.

---

## 9. Migration path from current schema

| Step | Task | Description |
|------|------|-------------|
| 1 | `TELEGRAM-ACCOUNT-DB-001` | Create `accounts`, seed `default-demo` |
| 2 | `TELEGRAM-ACCOUNT-DB-002` | Rename/migrate `telegram_settings` → `telegram_bot_configs` + `account_id` |
| 3 | `TELEGRAM-ACCOUNT-DB-003` | Create `telegram_notification_logs` |
| 4 | `TELEGRAM-ACCOUNT-API-001` | `AccountContext`, scope queries, `GET /api/telegram/notifications` |
| 5 | `TELEGRAM-ACCOUNT-API-002` | Remove `botToken` from settings JSON; add `botUsername`, `lastTestStatus` |
| 6 | `TELEGRAM-ACCOUNT-SEND-001` | Log every send/skipped in `telegram_notification_logs` |
| 7 | `TELEGRAM-ACCOUNT-UI-001` | Wire journal panel to API; remove `mockLogs` |
| 8 | `TELEGRAM-AUTH-001` | (Later) User model + middleware — out of scope here |

**Backward compatibility:** during step 2, keep reading legacy single row if `account_id` null, then backfill.

---

## 10. Event types and journal mapping

| `event_type` | Trigger | `shipment_id` | `checkpoint_id` |
|--------------|---------|---------------|-----------------|
| `test_message` | POST test-message | null | null |
| `shipment_created` | POST /shipments | yes | null |
| `status_changed` | PATCH /shipments/{id}/status | yes | null |
| `checkpoint_added` | POST /shipments/{id}/checkpoints | yes | yes |
| `finance_status_changed` | (future) PATCH finance | optional | null |

**Skipped logging:** when `shouldNotifyForShipment` returns false, optionally insert `status=skipped` with reason in `error_message` (e.g. `event_flag_disabled`) — product decision; recommended for journal clarity.

---

## 11. Environment variables (unchanged)

| Variable | Scope |
|----------|--------|
| `TELEGRAM_BOT_TOKEN` | Server-only; default bot for demo account when DB empty |
| `TELEGRAM_DEFAULT_CHAT_ID` | Server-only fallback chat |
| `TELEGRAM_WEBHOOK_SECRET` | Per-deploy; future per-account webhook secrets in DB |
| `TELEGRAM_TIMEOUT` | HTTP client timeout |

No `VITE_TELEGRAM_*` variables.

---

## 12. QA checklist (account architecture)

### Data and security

- [ ] Default Demo Account exists after seed/migration.
- [ ] `bot_token` encrypted in DB; raw value not in `SELECT` output via API.
- [ ] `GET /api/telegram/settings` has no `botToken` field (or only `configured`).
- [ ] `PATCH` with token does not return token in response.
- [ ] Logs table rows scoped to demo account only in single-tenant mode.

### Journal API

- [ ] Test message creates `sent` or `failed` log row.
- [ ] Shipment create with notifications on creates log row when send attempted.
- [ ] Disabled settings create `skipped` or no send (document chosen behavior).
- [ ] Pagination works on `GET /api/telegram/notifications`.

### UI

- [ ] Journal shows real rows; no mock data.
- [ ] Failed row shows short Russian error.
- [ ] Token not visible in DOM or network responses.

### Future auth (when implemented)

- [ ] User A cannot read account B Telegram config or logs.
- [ ] Webhook routes resolve account by slug or secret.

---

## 13. Out of scope (this architecture)

- User login, registration, password reset, RBAC.
- Per-client Telegram subscriptions (DM opt-in).
- Multiple bots per account (single config in MVP+).
- Message edit/delete in Telegram.
- Horizon/queue workers (sync send + log acceptable for MVP+).

---

## 14. References

| Resource | Path |
|----------|------|
| MVP bot scope | `docs/TELEGRAM_BOT_SCOPE.md` |
| Telegram page | `src/pages/Telegram.tsx` |
| Settings API | `backend/app/Http/Controllers/Api/TelegramSettingController.php` |
| Bot service | `backend/app/Services/TelegramBotService.php` |
| Current model | `backend/app/Models/TelegramSetting.php` |
| Settings migration | `backend/database/migrations/2026_05_20_100006_create_telegram_settings_table.php` |
