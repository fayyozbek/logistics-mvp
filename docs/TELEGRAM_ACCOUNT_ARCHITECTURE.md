# Telegram User & Account Notification Architecture

**Task:** TELEGRAM-ACCOUNT-SCOPE-001, corrected by **TELEGRAM-ARCHITECTURE-CORRECTION-001**

**Status:** Architecture documentation (target model; code may lag — see §2)

**Last updated:** 2026-05-22

## Purpose

Define how **one shared Logistics Telegram bot** delivers notifications to **many users/accounts**, each with their own chat target and preferences.

**Correct model:**

- **One** `TELEGRAM_BOT_TOKEN` — global backend environment variable only.
- **Per user/account** — `telegram_chat_id`, optional `telegram_username`, enabled flags, notification toggles, and **own notification history**.
- **No** separate bot token per account, user, or tenant.

Until auth exists, use a **Default Demo user/account** for settings and logs. When auth is added, resolve the active principal from the session and scope all reads/writes to that user or account.

**Related:** [TELEGRAM_BOT_SCOPE.md](./TELEGRAM_BOT_SCOPE.md) — sends, endpoints, env vars, production checklist.

---

## Architecture correction (TELEGRAM-ARCHITECTURE-CORRECTION-001)

| Topic | Incorrect direction (do not build toward) | Correct direction |
|-------|----------------------------------------|-------------------|
| Bot identity | `telegram_bot_configs.bot_token` per account, DB-encrypted token fallback | Single bot from `TELEGRAM_BOT_TOKEN` env only |
| Token in API | `PATCH` accepts `botToken`, masked `botToken` in GET | No token field in API; `configured: true/false` from env only |
| Token in DB | `telegram_settings.bot_token`, `telegram_bot_configs.bot_token_encrypted` | **Forbidden** — remove in migration follow-on |
| Per-account meaning | Each account runs its own @BotFather bot | Each account/user only stores **where to send** (chat id) and **what to send** (toggles) |
| Logs | Per account (correct) | Per user/account (unchanged intent) |

---

## 1. Concepts

### 1.1 Global bot (application-wide)

| Item | Rule |
|------|------|
| `TELEGRAM_BOT_TOKEN` | Set once in Render/local backend env. Never in frontend, never in DB, never in API responses or logs. |
| Bot username | Resolved via Telegram `getMe` and cached in config or returned as read-only metadata in status API. Not a secret. |
| Webhook | One webhook URL per deployment; `TELEGRAM_WEBHOOK_SECRET` is deployment-wide. |

### 1.2 User/account notification settings (per principal)

Each **user** or **account** (tenant member) has at most one row of **notification settings** — not a separate bot.

| Field | Stored | Returned to frontend |
|-------|--------|----------------------|
| `telegram_chat_id` | DB | **Yes** |
| `telegram_username` | DB (optional, e.g. `@username`) | **Yes** |
| `enabled` / `connected` | DB | **Yes** |
| `notifications_enabled` | DB | **Yes** |
| Event toggles | DB (`notify_shipment_created`, `notify_status_changed`, `notify_checkpoint_added`, or `event_flags` JSON) | **Yes** |
| `last_tested_at`, `last_test_status` | DB | **Yes** — short status only |
| `bot_token` | **Must not exist** | **Never** |

**Default Demo (MVP until auth):** one settings row linked to `accounts.slug = default-demo` or a dedicated demo user id. All current API traffic uses this principal via `AccountContext` / future `UserContext`.

### 1.3 Notification log (per user/account)

Every outbound attempt (test or automated) appends a row **scoped to the same user/account** as the settings row. Logs reference the global bot implicitly; they do not store a token.

---

## 2. Current implementation vs target

### 2.1 Implemented today (feature branch — partial drift)

| Piece | Current behavior | Alignment with corrected architecture |
|-------|------------------|--------------------------------------|
| Sends | `TelegramBotService` uses env token, with **incorrect** fallback to per-account `bot_token_encrypted` | **Migrate:** env token only |
| `telegram_settings` | Legacy single row; may include encrypted `bot_token` | **Deprecate** DB token column |
| `telegram_bot_configs` | Per-account row including `bot_token_encrypted` | **Rename/refactor** to settings-without-token table |
| `telegram_notification_logs` | Per `account_id` — correct scoping | **Keep**; drop `telegram_bot_config_id` or repoint to settings id |
| Status API | `botTokenSource: env \| config` | **Change to:** `configured` from env only; remove `config` token source |
| Frontend | No token input; journal from API | **Aligned** |
| Auth | Default Demo Account via `AccountContext` | **Aligned** until per-user auth |

### 2.2 Target (corrected)

| Piece | Target behavior |
|-------|-----------------|
| Token | `TELEGRAM_BOT_TOKEN` env only; service refuses DB token paths |
| Settings table | `telegram_notification_settings` (or evolved `telegram_bot_configs` **without** token columns) per `account_id` / `user_id` |
| Logs table | `telegram_notification_logs` per `account_id` / `user_id` |
| API | Settings PATCH: chat id, username, toggles, enabled — **no** `botToken` |
| API status | `configured` = env token present; `hasChatId` = settings chat id present |

---

## 3. Data model (target schema)

### 3.1 `accounts` (workspace — optional until auth)

```text
accounts
  id, slug, name, is_active, timestamps
```

MVP seed: `default-demo`. Future: real customer workspaces.

### 3.2 `telegram_notification_settings` (per account or user)

**One row per account** (or per user when auth exists). **No bot token columns.**

```text
telegram_notification_settings
  id                      bigint PK
  account_id              bigint FK → accounts, unique   -- or user_id when auth exists
  telegram_chat_id        string nullable
  telegram_username       string nullable
  enabled                 boolean default false
  notifications_enabled   boolean default true
  notify_shipment_created boolean default true
  notify_status_changed   boolean default true
  notify_checkpoint_added boolean default true
  last_tested_at          timestamp nullable
  last_test_status        string nullable   -- success | failed | skipped
  last_test_error         string nullable   -- short, safe
  created_at, updated_at
```

**Chat ID resolution (per send):**

1. Explicit `chat_id` argument (e.g. test message override).
2. Current principal’s `telegram_notification_settings.telegram_chat_id`.
3. Optional `TELEGRAM_DEFAULT_CHAT_ID` env (bootstrap / ops only — not per-user).

**Token resolution (global only):**

1. `TELEGRAM_BOT_TOKEN` from env / `config/telegram.php`.
2. If missing → not configured; no DB fallback.

### 3.3 `telegram_notification_logs` (per account or user)

```text
telegram_notification_logs
  id                    bigint PK
  account_id            bigint FK → accounts   -- or user_id
  settings_id           bigint FK nullable → telegram_notification_settings
  event_type            string
  related_type          string nullable      -- shipment | checkpoint
  related_id            bigint nullable
  chat_id               string nullable      -- target used for this attempt
  message_preview       text nullable      -- max ~200 chars
  status                string             -- sent | failed | skipped
  telegram_message_id   string nullable
  error_message         text nullable
  sent_at               timestamp nullable
  created_at, updated_at
```

Index: `(account_id, created_at DESC)`.

---

## 4. API design

Until auth exists, all Telegram routes resolve **Default Demo** settings and logs.

### 4.1 Settings and status

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/telegram/settings` | Principal’s chat id, username, toggles, enabled. **No `botToken`.** |
| `PATCH` | `/api/telegram/settings` | Update `chatId`, `telegramUsername`, toggles, `connected`/`enabled`. **Reject or ignore `botToken`.** |
| `GET` | `/api/telegram/status` | `configured` (env token present), `enabled`, `hasChatId`, `notificationsEnabled`, `botUsername` (from getMe cache or static), optional `lastTestStatus` |

`botTokenSource` should be removed or always imply env-only when `configured` is true.

### 4.2 Test message

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/api/telegram/test-message` | Send via **global** bot to principal’s `chat_id` (or request override); append log row. |

### 4.3 Notification journal

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/api/telegram/notifications` | Paginated logs for **current principal only**. Filters: `status`, `event_type`, `limit`, `page`. |

### 4.4 Automated sends

`TelegramBotService` loads global token once, resolves principal settings for chat id and toggles, sends, logs to principal’s history. Failure never breaks shipment/checkpoint/status API.

---

## 5. Security rules (non-negotiable)

| Rule | Implementation |
|------|----------------|
| Single global token | `TELEGRAM_BOT_TOKEN` in backend env only |
| No token in DB | Drop `bot_token` / `bot_token_encrypted` columns in follow-on migration |
| No token in API | No GET/PATCH/POST field for token; status uses `configured: boolean` |
| No token in frontend | No input, no display, no `VITE_*` Telegram secrets |
| No token in logs | Journal and application logs never contain token or full Telegram error payloads with secrets |
| Per-principal isolation (future) | User A cannot read or send using User B’s chat id or journal |

---

## 6. Frontend UI

**Page:** `Telegram-бот` (`src/pages/Telegram.tsx`)

| Area | Behavior |
|------|----------|
| Settings | Chat ID, optional username display, enabled, notification toggles |
| Status badge | «Токен настроен» = env configured (server-side); not user-editable |
| Test message | Uses global bot + saved chat id |
| Journal | Principal’s own history from `GET /api/telegram/notifications` |

---

## 7. Principal resolution (no auth yet)

```text
Request → AccountContext::current()   -- later UserContext or auth()->user()
            → default-demo until login
            → load telegram_notification_settings for that account_id
            → scope telegram_notification_logs to same account_id
```

When auth ships:

```text
authenticated user → user.account_id (or user.id)
                  → settings row for that principal
                  → logs row for that principal only
```

---

## 8. Migration from drifted implementation

| Step | Task | Description |
|------|------|-------------|
| 1 | `TELEGRAM-TOKEN-CLEANUP-001` | Stop reading/writing DB token; env only in `TelegramBotService` |
| 2 | `TELEGRAM-TOKEN-CLEANUP-002` | Remove `botToken` from API request/response; update tests |
| 3 | `TELEGRAM-SETTINGS-RENAME-001` | Rename `telegram_bot_configs` → `telegram_notification_settings`; drop token column |
| 4 | `TELEGRAM-LEGACY-SETTINGS-001` | Deprecate `telegram_settings.bot_token`; migrate chat/toggles to per-principal table |
| 5 | `TELEGRAM-AUTH-001` | (Later) Map settings/logs to authenticated user |

**Do not** add new per-account bot tokens in any migration.

---

## 9. Event types and journal

| `event_type` | Trigger |
|--------------|---------|
| `test_message` | POST `/api/telegram/test-message` |
| `shipment_created` | POST `/api/shipments` |
| `shipment_status_changed` | PATCH `/api/shipments/{id}/status` |
| `checkpoint_added` | POST `/api/shipments/{id}/checkpoints` |
| `finance_status_changed` | (optional future) |

---

## 10. Environment variables

| Variable | Scope |
|----------|--------|
| `TELEGRAM_BOT_TOKEN` | **Required** for sending — global, server-only |
| `TELEGRAM_DEFAULT_CHAT_ID` | Optional ops bootstrap only — not a substitute for per-user chat id |
| `TELEGRAM_WEBHOOK_SECRET` | Global per deployment |
| `TELEGRAM_TIMEOUT` | HTTP client timeout |

No `VITE_TELEGRAM_*` variables.

---

## 11. Out of scope

- Multiple bot tokens per account/tenant.
- Storing bot token in PostgreSQL (encrypted or not).
- Frontend token setup form.
- Per-client Telegram subscription flows (DM opt-in) — later product.
- Auth implementation in this doc — separate tasks.

---

## 12. References

| Resource | Path |
|----------|------|
| MVP scope | `docs/TELEGRAM_BOT_SCOPE.md` |
| Telegram page | `src/pages/Telegram.tsx` |
| Bot service | `backend/app/Services/TelegramBotService.php` |
| Account context | `backend/app/Services/AccountContext.php` |
