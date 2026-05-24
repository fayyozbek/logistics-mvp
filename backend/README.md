# Logistix API (Laravel)

JSON API for the React/Vite logistics UI in the repository root.

See the [root README](../README.md) for full local setup, deployment, and CORS notes.

The `Dockerfile` and `start.sh` in this directory are used by Render's Docker
Web Service. The image is `php:8.4-cli-bookworm` (Symfony 8 in `composer.lock` requires
PHP >= 8.4) with extensions: `mbstring`, `bcmath`, `intl`, `opcache`, `pdo`,
`pdo_pgsql`, `pgsql`, `zip`, `pcntl`.

The Docker build does **not** run `php artisan key:generate`. Set `APP_KEY` in
Render environment variables before deploy (see root README Step 4).

Render Free has no Shell access. At startup, `start.sh` optionally runs:

- `RUN_MIGRATIONS=true` → `php artisan migrate --force`
- `RUN_SEEDERS=true` → `php artisan db:seed --force`

Then starts `php artisan serve` on `$PORT`. Demo seeders are idempotent; after
the first demo seed, set `RUN_SEEDERS=false` on Render so restarts do not reset
Telegram settings or overwrite stakeholder edits.

## Quick local setup

```bash
composer install
cp .env.example .env
# Edit .env: APP_ENV=local, APP_DEBUG=true, DB_CONNECTION=sqlite,
#            comment out DATABASE_URL, FRONTEND_URL=http://localhost:5173
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

## Tests

```bash
php artisan test
```

## Authentication (Sanctum)

Token-based API auth via Laravel Sanctum. Login returns a Bearer token; protected write routes require `Authorization: Bearer {token}`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | `{ email, password }` → `{ token, user }` |
| POST | `/api/auth/logout` | Bearer | Revokes current token |
| GET | `/api/auth/me` | Bearer | Current user (no password) |

### Demo users (local seed only)

Password for all demo users: **`password`** (see `UserSeeder::DEMO_PASSWORD` — local/demo only, never use in production).

| Email | Role |
|-------|------|
| `admin@example.com` | admin |
| `manager@example.com` | manager |
| `operator@example.com` | operator |
| `finance@example.com` | finance |
| `viewer@example.com` | viewer |

### Protected write routes (first auth pass)

| Route | Roles |
|-------|-------|
| `DELETE /api/shipments/{id}` | admin |
| `PATCH /api/telegram/settings` | admin |
| `POST /api/telegram/test-message` | admin |
| `PATCH /api/finance/{id}/status` | admin, finance |

Read routes remain public until frontend auth is wired. See `docs/AUTH_ROLES_SCOPE.md`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/dashboard` | KPI summary and charts |
| GET | `/api/shipments` | Shipment list |
| POST | `/api/shipments` | Create shipment |
| GET | `/api/shipments/{id}` | Single shipment |
| PATCH | `/api/shipments/{id}/status` | Update shipment status |
| DELETE | `/api/shipments/{id}` | Archive shipment (soft delete) — **admin** |
| POST | `/api/shipments/{id}/checkpoints` | Add checkpoint |
| PATCH | `/api/checkpoints/{id}` | Update checkpoint |
| GET | `/api/tracking` | Tracking view |
| GET | `/api/managers` | Manager list |
| GET | `/api/finance` | Finance records |
| PATCH | `/api/finance/{id}/status` | Update finance status — **admin, finance** |
| GET | `/api/telegram/settings` | Per-account notification settings (no token) + shipments list |
| PATCH | `/api/telegram/settings` | Update chat id, toggles, display name (`botToken` rejected with 422) — **admin** |
| GET | `/api/telegram/status` | Safe bot status: configured/enabled/hasChatId/notificationsEnabled |
| POST | `/api/telegram/test-message` | Send test message `{ chatId?, message? }` — **admin** |
| GET | `/api/telegram/notifications` | Notification journal (`status`, `event_type`, `limit`, `page` query params) |

## Per-account Telegram notification tables (TELEGRAM-DB-REFINE-001)

One global bot token (`TELEGRAM_BOT_TOKEN` env only). Per-account chat settings and notification journal via `telegram_notification_settings`. Legacy `telegram_settings` table remains seeded for migration compatibility but is not used by the API.

| Table | Purpose |
|-------|---------|
| `accounts` | Workspace/tenant; MVP seeds one row `slug=default-demo` |
| `telegram_notification_settings` | Per account: `telegram_chat_id`, `telegram_username`, toggles — **no bot token** |
| `telegram_notification_logs` | Append-only send journal (`sent` / `failed` / `skipped`) |

Models: `Account`, `TelegramNotificationSetting`, `TelegramNotificationLog` (`TelegramBotConfig` is a deprecated alias). Seeder: `AccountTelegramSeeder` (idempotent, called from `DatabaseSeeder`).

See `docs/TELEGRAM_ACCOUNT_ARCHITECTURE.md` in the repo root.

## Telegram bot service

`app/Services/TelegramBotService` handles outbound Telegram Bot API notifications.

**Setting resolution (MVP):** `getCurrentSetting()` loads `telegram_notification_settings` for the Default Demo Account (`AccountContext`). Future auth will resolve the row from the authenticated user/account.

**Token resolution:** `TELEGRAM_BOT_TOKEN` env / `config/telegram.php` only (never from DB).

**Chat ID resolution (priority order):**
1. Explicit `$chatId` argument
2. `getCurrentSetting()->telegram_chat_id`
3. `TELEGRAM_DEFAULT_CHAT_ID` env

**Available methods:**

| Method | Description |
|--------|-------------|
| `isConfigured()` | True when env bot token is set |
| `getCurrentSetting()` | Active per-account notification settings row |
| `getDefaultChatId()` | Resolved chat ID for current principal |
| `sendMessage($text, $chatId?, $eventType?, $related?)` | Send text; logs every attempt |
| `sendTestMessage($message?, $chatId?)` | Send verification message |
| `sendShipmentCreatedNotification($shipment)` | Notify on shipment create |
| `sendShipmentStatusChangedNotification($shipment, $old, $new)` | Notify on status change |
| `sendCheckpointAddedNotification($shipment, $checkpoint)` | Notify on checkpoint add |

All methods return `['success' => bool, 'message' => string, 'telegram_message_id' => int|null, 'error' => string|null]`.
Failures never throw — errors are returned as `success: false` and logged via `Log::warning`.
The bot token is **never** present in returned arrays, logs, or API responses.

**Required env variables (set in Render, never commit values):**

```
TELEGRAM_BOT_TOKEN=        # From @BotFather
TELEGRAM_DEFAULT_CHAT_ID=  # Optional bootstrap chat ID
TELEGRAM_WEBHOOK_SECRET=   # Recommended in production
TELEGRAM_TIMEOUT=10        # HTTP timeout in seconds
```

**Events that trigger notifications** (wired in `TELEGRAM-BOT-EVENTS-001`):

| Event | Flag checked | Method called |
|-------|-------------|---------------|
| Shipment created | `departure` | `sendShipmentCreatedNotification` |
| Status → `in_transit` | `departure` | `sendShipmentStatusChangedNotification` |
| Status → `at_checkpoint` | `checkpoint` | `sendShipmentStatusChangedNotification` |
| Status → `delivered` | `delivery` | `sendShipmentStatusChangedNotification` |
| Status → `delayed` | `delay` | `sendShipmentStatusChangedNotification` |
| Checkpoint added | `checkpoint` | `sendCheckpointAddedNotification` |

All conditions required to send: token configured **AND** `shipment.telegram_notifications = true` **AND** account config `enabled` + `notifications_enabled` **AND** relevant notify toggle (`notify_shipment_created`, `notify_status_changed`, `notify_checkpoint_added`). Telegram failures never affect the primary API response.

**Notification journal:** every send attempt (sent / failed / skipped) is stored in `telegram_notification_logs` with a short `message_preview` (max 200 chars) and safe `error_message` (no bot token). Query via `GET /api/telegram/notifications`. Retry endpoint is **post-MVP** (not implemented).

## Finance amounts (MVP)

`PATCH /api/finance/{id}/status` accepts **`status` only** (no payment gateway or
custom `paidAmount` in the request). The API keeps amounts aligned with status:

| Status | `paid_amount` | Balance (`total_amount - paid_amount`) |
|--------|---------------|----------------------------------------|
| `paid` | equals `total_amount` | `0` |
| `unpaid`, `overdue` | `0` | equals `total_amount` |
| `partial` | between `0` and `total_amount` | greater than `0` |

When status becomes `partial` and the current `paid_amount` is already in range,
that value is kept; otherwise `paid_amount` defaults to half of `total_amount`
(demo-friendly placeholder until a dedicated payment-amount endpoint exists).

Demo seed data uses the same rules via `FinanceAmountRules`.

## CORS

`config/cors.php` allows `http://localhost:5173`, `http://127.0.0.1:5173`, and
`FRONTEND_URL` (trailing slashes are stripped). On Render set:

`FRONTEND_URL=https://logistics-mvp-sigma.vercel.app`

Redeploy the Web Service after changing this variable.
