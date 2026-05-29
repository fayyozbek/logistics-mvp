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

| Email | Role | Demo account |
|-------|------|--------------|
| `admin@example.com` | admin | Admin Demo Account (`admin-demo`) |
| `manager@example.com` | manager | Manager Demo Account (`manager-demo`) |
| `operator@example.com` | operator | Operator Demo Account (`operator-demo`) |
| `finance@example.com` | finance | Finance Demo Account (`finance-demo`) |
| `viewer@example.com` | viewer | Viewer Demo Account (`viewer-demo`) |

Each demo user has a separate `account_id` and `telegram_notification_settings` row for Telegram isolation testing. Login credentials are unchanged.

### Protected write routes (first auth pass)

| Route | Roles |
|-------|-------|
| `DELETE /api/shipments/{id}` | admin |
| `PATCH /api/telegram/settings` | admin |
| `POST /api/telegram/test-message` | admin |
| `PATCH /api/finance/{id}/status` | admin, finance |

All routes except `GET /api/health` and `POST /api/auth/login` require Sanctum auth. Role middleware applies per route group. See `docs/AUTH_ROLES_SCOPE.md`.

### User management (admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List users (`?limit=50`, max 100). Returns `users` + `meta`. |
| POST | `/api/users` | Create user (`name`, `email`, `password`, `role`, optional `accountId`, `isActive`). |
| GET | `/api/users/{id}` | Show user (no password hash). |
| PATCH | `/api/users/{id}` | Update user fields; optional `password`; `isActive: false` deactivates. |
| DELETE | `/api/users/{id}` | Deactivate user (`is_active=false`); revokes tokens. |

Guards: admin cannot deactivate self; cannot deactivate the last active admin. Inactive users cannot log in.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/dashboard` | KPI summary and charts |
| GET | `/api/shipments` | Shipment list |
| POST | `/api/shipments` | Create shipment |
| GET | `/api/shipments/{id}` | Single shipment |
| PATCH | `/api/shipments/{id}` | Update shipment fields — **admin, manager, operator** |
| DELETE | `/api/shipments/{id}` | Archive shipment (soft delete) — **admin, manager** |
| PATCH | `/api/shipments/{id}/status` | Update shipment status — **admin, manager, operator** |
| POST | `/api/shipments/{id}/checkpoints` | Add checkpoint — **admin, manager, operator** |
| PATCH | `/api/checkpoints/{id}` | Update checkpoint — **admin, manager, operator** |
| DELETE | `/api/checkpoints/{id}` | Delete checkpoint — **admin, manager, operator** |
| GET | `/api/tracking` | Tracking view |
| GET | `/api/clients` | Partner/client list — **admin, manager, operator, finance, viewer** |
| POST | `/api/clients` | Create partner/client — **admin, manager, operator** |
| GET | `/api/clients/{id}` | Single partner/client — **viewer+** |
| PATCH | `/api/clients/{id}` | Update partner/client — **admin, manager, operator** |
| DELETE | `/api/clients/{id}` | Delete partner/client (blocked if referenced) — **admin** |
| GET | `/api/managers` | Manager list — **admin, manager, operator** |
| GET | `/api/managers/overview` | Managers page bundle (managers + clients + shipments) — **admin, manager, operator** |
| POST | `/api/managers` | Create manager — **admin** |
| GET | `/api/managers/{id}` | Single manager — **admin, manager, operator** |
| PATCH | `/api/managers/{id}` | Update manager — **admin** |
| DELETE | `/api/managers/{id}` | Delete manager (blocked if active shipments assigned) — **admin** |
| GET | `/api/export/shipments.csv` | Export shipments CSV — **admin, manager, operator, finance** |
| GET | `/api/export/finance.csv` | Export finance CSV — **admin, manager, operator, finance** |
| GET | `/api/finance/report` | Finance report summary — **viewer+** |
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
| `accounts` | Workspace/tenant; MVP seeds five demo rows (one per demo role) |
| `telegram_notification_settings` | Per account: `telegram_chat_id`, `telegram_username`, toggles — **no bot token** |
| `telegram_notification_logs` | Append-only send journal (`sent` / `failed` / `skipped`) |

Models: `Account`, `TelegramNotificationSetting`, `TelegramNotificationLog` (`TelegramBotConfig` is a deprecated alias). Seeder: `AccountTelegramSeeder` (idempotent, called from `DatabaseSeeder`).

See `docs/TELEGRAM_ACCOUNT_ARCHITECTURE.md` in the repo root.

## Telegram bot service

`app/Services/TelegramBotService` handles outbound Telegram Bot API notifications.

**Setting resolution (MVP):** `getCurrentSetting()` loads `telegram_notification_settings` for the authenticated user's account (`AccountContext`). Unauthenticated local/demo requests fall back to the Admin Demo Account.

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

## Tracking numbers

Auto-generated numbers use the format `LGX-YYYY-NNNN` (e.g. `LGX-2026-0562`).
A persistent `tracking_number_counters` table stores the last sequence per calendar
year so numbers are **monotonic** and are **not reused** when shipments are deleted.
Demo seeders sync the counter from existing demo shipments after `ShipmentSeeder`.

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
