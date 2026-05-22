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

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/dashboard` | KPI summary and charts |
| GET | `/api/shipments` | Shipment list |
| POST | `/api/shipments` | Create shipment |
| GET | `/api/shipments/{id}` | Single shipment |
| PATCH | `/api/shipments/{id}/status` | Update shipment status |
| POST | `/api/shipments/{id}/checkpoints` | Add checkpoint |
| PATCH | `/api/checkpoints/{id}` | Update checkpoint |
| GET | `/api/tracking` | Tracking view |
| GET | `/api/managers` | Manager list |
| GET | `/api/finance` | Finance records |
| PATCH | `/api/finance/{id}/status` | Update finance status |
| GET | `/api/telegram/settings` | Telegram bot settings (token masked) |
| PATCH | `/api/telegram/settings` | Save Telegram settings (token response masked) |
| GET | `/api/telegram/status` | Safe bot status: configured/enabled/hasChatId/notificationsEnabled |
| POST | `/api/telegram/test-message` | Send test message `{ chatId?, message? }` |

## Telegram bot service

`app/Services/TelegramBotService` handles outbound Telegram Bot API notifications.

**Token resolution (priority order):**
1. `TELEGRAM_BOT_TOKEN` env / `config/telegram.php`
2. Encrypted `bot_token` stored in `telegram_settings` DB row

**Chat ID resolution (priority order):**
1. Explicit `$chatId` argument passed to a notification method
2. `telegram_settings.chat_id` (DB row)
3. `TELEGRAM_DEFAULT_CHAT_ID` env

**Available methods:**

| Method | Description |
|--------|-------------|
| `isConfigured()` | Returns true when a bot token is available |
| `getDefaultChatId()` | Returns resolved default chat ID (DB → env) |
| `sendMessage($chatId, $text)` | Send arbitrary text to a chat |
| `sendTestMessage($chatId?)` | Send a test verification message |
| `sendShipmentCreatedNotification($shipment, $chatId?)` | Notify on shipment create |
| `sendShipmentStatusChangedNotification($shipment, $old, $new, $chatId?)` | Notify on status change |
| `sendCheckpointAddedNotification($shipment, $checkpoint, $chatId?)` | Notify on checkpoint add |

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

All conditions required to send: token configured **AND** `shipment.telegram_notifications = true` **AND** global `connected = true` **AND** relevant event flag on. Telegram failures never affect the primary API response.

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
