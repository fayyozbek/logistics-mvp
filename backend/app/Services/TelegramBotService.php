<?php

namespace App\Services;

use App\Models\Checkpoint;
use App\Models\Shipment;
use App\Models\TelegramSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Handles outbound Telegram Bot API notifications.
 *
 * Token resolution order (sendMessage):
 *   1. TELEGRAM_BOT_TOKEN env / config
 *   2. Encrypted bot_token stored in telegram_settings (first row)
 *
 * Chat ID resolution order (notification helpers):
 *   1. $chatId argument (explicit override)
 *   2. telegram_settings.chat_id (DB row)
 *   3. TELEGRAM_DEFAULT_CHAT_ID env / config
 *
 * The bot token is NEVER included in returned result arrays or log output.
 */
class TelegramBotService
{
    private const API_BASE = 'https://api.telegram.org/bot';

    // -------------------------------------------------------------------------
    // Public interface
    // -------------------------------------------------------------------------

    /**
     * Returns true when a bot token is available (env or DB).
     */
    public function isConfigured(): bool
    {
        return $this->resolveToken() !== null;
    }

    /**
     * Returns the resolved default chat ID (DB → env fallback), or null.
     */
    public function getDefaultChatId(): ?string
    {
        $setting = TelegramSetting::query()->first();

        if ($setting?->chat_id) {
            return $setting->chat_id;
        }

        $fallback = config('telegram.default_chat_id');

        return ($fallback !== null && $fallback !== '') ? $fallback : null;
    }

    /**
     * Send an arbitrary message to a Telegram chat.
     *
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendMessage(string $chatId, string $text): array
    {
        $token = $this->resolveToken();

        if ($token === null) {
            return $this->failure('Telegram bot token not configured.', 'missing_token');
        }

        if ($chatId === '') {
            return $this->failure('Telegram chat ID is required.', 'missing_chat_id');
        }

        try {
            $response = Http::timeout((int) config('telegram.timeout', 10))
                ->post(self::API_BASE . $token . '/sendMessage', [
                    'chat_id' => $chatId,
                    'text' => $text,
                    'disable_web_page_preview' => true,
                ]);

            $body = $response->json() ?? [];

            if (! $response->successful() || ! ($body['ok'] ?? false)) {
                return $this->failure(
                    $body['description'] ?? 'Telegram API returned an error.',
                    'api_error',
                );
            }

            return [
                'success' => true,
                'message' => 'Message sent successfully.',
                'telegram_message_id' => isset($body['result']['message_id'])
                    ? (int) $body['result']['message_id']
                    : null,
                'error' => null,
            ];
        } catch (\Throwable $e) {
            Log::warning('TelegramBotService: failed to deliver message.', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);

            return $this->failure(
                'Failed to send Telegram message: network or connection error.',
                'network_error',
            );
        }
    }

    /**
     * Send a test message to verify bot configuration.
     *
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendTestMessage(?string $chatId = null): array
    {
        $resolvedChatId = $this->resolveChatId($chatId);

        if ($resolvedChatId === null) {
            return $this->failure('Telegram chat ID not configured.', 'missing_chat_id');
        }

        $text = "✅ Проверочное сообщение от Logistix.\nУведомления Telegram настроены корректно.";

        return $this->sendMessage($resolvedChatId, $text);
    }

    /**
     * Notify that a new shipment was created.
     *
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendShipmentCreatedNotification(Shipment $shipment, ?string $chatId = null): array
    {
        $resolvedChatId = $this->resolveChatId($chatId);

        if ($resolvedChatId === null) {
            return $this->failure('Telegram chat ID not configured.', 'missing_chat_id');
        }

        $text = implode("\n", [
            '🚚 Новый груз создан: ' . $shipment->tracking_number,
            'Маршрут: ' . $shipment->origin . ' → ' . $shipment->destination,
            'Груз: ' . ($shipment->cargo ?? '—'),
            'Статус: ' . $this->statusLabel($shipment->status),
        ]);

        return $this->sendMessage($resolvedChatId, $text);
    }

    /**
     * Notify that a shipment status has changed.
     *
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendShipmentStatusChangedNotification(
        Shipment $shipment,
        ?string $oldStatus,
        ?string $newStatus,
        ?string $chatId = null,
    ): array {
        $resolvedChatId = $this->resolveChatId($chatId);

        if ($resolvedChatId === null) {
            return $this->failure('Telegram chat ID not configured.', 'missing_chat_id');
        }

        $text = implode("\n", [
            '🔄 Статус груза обновлён: ' . $shipment->tracking_number,
            'Было: ' . $this->statusLabel($oldStatus),
            'Стало: ' . $this->statusLabel($newStatus),
        ]);

        return $this->sendMessage($resolvedChatId, $text);
    }

    /**
     * Notify that a checkpoint was added to a shipment.
     *
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendCheckpointAddedNotification(
        Shipment $shipment,
        Checkpoint $checkpoint,
        ?string $chatId = null,
    ): array {
        $resolvedChatId = $this->resolveChatId($chatId);

        if ($resolvedChatId === null) {
            return $this->failure('Telegram chat ID not configured.', 'missing_chat_id');
        }

        $location = trim(implode(', ', array_filter([
            $checkpoint->city,
            $checkpoint->country,
        ])));

        $text = implode("\n", [
            '📍 Новая точка маршрута: ' . $shipment->tracking_number,
            'Локация: ' . ($location ?: ($checkpoint->address ?? '—')),
            'Статус точки: ' . $this->checkpointStatusLabel($checkpoint->status),
        ]);

        return $this->sendMessage($resolvedChatId, $text);
    }

    // -------------------------------------------------------------------------
    // Event gating
    // -------------------------------------------------------------------------

    /**
     * Returns true when ALL conditions are met for sending a shipment-related
     * notification with the given event flag key:
     *   1. Bot token is configured (env or DB).
     *   2. The shipment's telegram_notifications flag is enabled.
     *   3. The global `connected` flag in telegram_settings is true.
     *   4. The specific event flag (departure / checkpoint / delivery / delay …) is on.
     *
     * Callers should call this before any notification method so that a missing
     * token or disabled setting never results in an unnecessary API query.
     */
    public function shouldNotifyForShipment(Shipment $shipment, string $eventFlagKey): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        if (! $shipment->telegram_notifications) {
            return false;
        }

        $setting = TelegramSetting::query()->first();

        if (! $setting?->connected) {
            return false;
        }

        $flags = $setting->event_flags ?? [];

        return (bool) ($flags[$eventFlagKey] ?? false);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Resolve bot token: env first, then encrypted DB value.
     * Returns null when no token is available.
     * NEVER include the returned value in logs or API responses.
     */
    private function resolveToken(): ?string
    {
        $envToken = config('telegram.bot_token');

        if ($envToken !== null && $envToken !== '') {
            return $envToken;
        }

        $setting = TelegramSetting::query()->first();
        $dbToken = $setting?->bot_token;

        return ($dbToken !== null && $dbToken !== '') ? $dbToken : null;
    }

    /**
     * Resolve effective chat ID from override, DB, or env fallback.
     */
    private function resolveChatId(?string $override): ?string
    {
        if ($override !== null && $override !== '') {
            return $override;
        }

        return $this->getDefaultChatId();
    }

    /**
     * Build a standardised failure result.
     *
     * @return array{success: false, message: string, telegram_message_id: null, error: string}
     */
    private function failure(string $message, string $error): array
    {
        return [
            'success' => false,
            'message' => $message,
            'telegram_message_id' => null,
            'error' => $error,
        ];
    }

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            'planned'        => 'Запланирован',
            'in_transit'     => 'В пути',
            'at_checkpoint'  => 'На пункте',
            'delivered'      => 'Доставлен',
            'delayed'        => 'Задержан',
            default          => $status ?? 'Неизвестен',
        };
    }

    private function checkpointStatusLabel(?string $status): string
    {
        return match ($status) {
            'passed'   => 'Пройдена',
            'current'  => 'Текущая',
            'upcoming' => 'Предстоящая',
            default    => $status ?? 'Неизвестен',
        };
    }
}
