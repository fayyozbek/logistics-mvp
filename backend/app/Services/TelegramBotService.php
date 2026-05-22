<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Checkpoint;
use App\Models\Shipment;
use App\Models\TelegramBotConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Handles outbound Telegram Bot API notifications per account.
 *
 * Token resolution (per account):
 *   1. telegram_bot_configs.bot_token_encrypted
 *   2. TELEGRAM_BOT_TOKEN env / config
 *
 * Chat ID resolution (per account):
 *   1. Explicit $chatId argument
 *   2. telegram_bot_configs.chat_id
 *   3. TELEGRAM_DEFAULT_CHAT_ID env / config
 *
 * The bot token is NEVER included in returned result arrays or log output.
 */
class TelegramBotService
{
    private const API_BASE = 'https://api.telegram.org/bot';

    public function __construct(private AccountContext $accountContext) {}

    // -------------------------------------------------------------------------
    // Account resolution
    // -------------------------------------------------------------------------

    public function currentAccount(): Account
    {
        return $this->accountContext->current();
    }

    public function getConfigForAccount(Account $account): ?TelegramBotConfig
    {
        return TelegramBotConfig::query()
            ->where('account_id', $account->id)
            ->first();
    }

    public function isConfiguredForAccount(Account $account): bool
    {
        return $this->resolveTokenForAccount($account) !== null;
    }

    /**
     * @return 'config'|'env'|null
     */
    public function tokenSourceForAccount(Account $account): ?string
    {
        $config = $this->getConfigForAccount($account);

        if ($config !== null && $this->configHasToken($config)) {
            return 'config';
        }

        $envToken = config('telegram.bot_token');

        if ($envToken !== null && $envToken !== '') {
            return 'env';
        }

        return null;
    }

    // -------------------------------------------------------------------------
    // Legacy convenience (default demo account)
    // -------------------------------------------------------------------------

    public function isConfigured(): bool
    {
        return $this->isConfiguredForAccount($this->currentAccount());
    }

    public function getDefaultChatId(): ?string
    {
        return $this->resolveChatIdForAccount($this->currentAccount(), null);
    }

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendMessage(string $chatId, string $text): array
    {
        return $this->sendMessageForAccount($this->currentAccount(), $text, $chatId);
    }

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendTestMessage(?string $chatId = null): array
    {
        return $this->sendTestMessageForAccount($this->currentAccount(), null, $chatId);
    }

    // -------------------------------------------------------------------------
    // Account-scoped sends
    // -------------------------------------------------------------------------

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendMessageForAccount(Account $account, string $text, ?string $chatId = null): array
    {
        $config = $this->getConfigForAccount($account);

        if ($config !== null && ! $config->enabled) {
            return $this->skipped('Telegram bot is disabled for this account.');
        }

        $token = $this->resolveTokenForAccount($account);

        if ($token === null) {
            return $this->failure('Telegram bot token not configured.', 'missing_token');
        }

        $resolvedChatId = $this->resolveChatIdForAccount($account, $chatId);

        if ($resolvedChatId === null || $resolvedChatId === '') {
            return $this->failure('Telegram chat ID not configured.', 'missing_chat_id');
        }

        try {
            $response = Http::timeout((int) config('telegram.timeout', 10))
                ->post(self::API_BASE . $token . '/sendMessage', [
                    'chat_id' => $resolvedChatId,
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
                'account_id' => $account->id,
                'chat_id' => $resolvedChatId,
                'error' => $e->getMessage(),
            ]);

            return $this->failure(
                'Failed to send Telegram message: network or connection error.',
                'network_error',
            );
        }
    }

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendTestMessageForAccount(
        Account $account,
        ?string $message = null,
        ?string $chatId = null,
    ): array {
        $text = ($message !== null && $message !== '')
            ? $message
            : "✅ Проверочное сообщение от Logistix.\nУведомления Telegram настроены корректно.";

        return $this->sendMessageForAccount($account, $text, $chatId);
    }

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendShipmentCreatedNotification(Shipment $shipment, ?Account $account = null): array
    {
        $account = $account ?? $this->currentAccount();

        $text = implode("\n", [
            '🚚 Новый груз создан: ' . $shipment->tracking_number,
            'Маршрут: ' . $shipment->origin . ' → ' . $shipment->destination,
            'Груз: ' . ($shipment->cargo ?? '—'),
            'Статус: ' . $this->statusLabel($shipment->status),
        ]);

        return $this->sendMessageForAccount(
            $account,
            $text,
            $this->resolveChatIdForAccount($account, null),
        );
    }

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendShipmentStatusChangedNotification(
        Shipment $shipment,
        ?string $oldStatus,
        ?string $newStatus,
        ?Account $account = null,
    ): array {
        $account = $account ?? $this->currentAccount();

        $text = implode("\n", [
            '🔄 Статус груза обновлён: ' . $shipment->tracking_number,
            'Было: ' . $this->statusLabel($oldStatus),
            'Стало: ' . $this->statusLabel($newStatus),
        ]);

        return $this->sendMessageForAccount(
            $account,
            $text,
            $this->resolveChatIdForAccount($account, null),
        );
    }

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendCheckpointAddedNotification(
        Shipment $shipment,
        Checkpoint $checkpoint,
        ?Account $account = null,
    ): array {
        $account = $account ?? $this->currentAccount();

        $location = trim(implode(', ', array_filter([
            $checkpoint->city,
            $checkpoint->country,
        ])));

        $text = implode("\n", [
            '📍 Новая точка маршрута: ' . $shipment->tracking_number,
            'Локация: ' . ($location ?: ($checkpoint->address ?? '—')),
            'Статус точки: ' . $this->checkpointStatusLabel($checkpoint->status),
        ]);

        return $this->sendMessageForAccount(
            $account,
            $text,
            $this->resolveChatIdForAccount($account, null),
        );
    }

    // -------------------------------------------------------------------------
    // Event gating
    // -------------------------------------------------------------------------

    public function shouldNotifyForShipment(Shipment $shipment, string $eventFlagKey): bool
    {
        $account = $this->currentAccount();
        $config  = $this->getConfigForAccount($account);

        if (! $this->isConfiguredForAccount($account)) {
            return false;
        }

        if ($config === null || ! $config->enabled || ! $config->notifications_enabled) {
            return false;
        }

        if (! $shipment->telegram_notifications) {
            return false;
        }

        return $this->eventFlagAllowsNotify($config, $eventFlagKey);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function resolveTokenForAccount(Account $account): ?string
    {
        $config = $this->getConfigForAccount($account);

        if ($config !== null && $this->configHasToken($config)) {
            return $config->bot_token_encrypted;
        }

        $envToken = config('telegram.bot_token');

        return ($envToken !== null && $envToken !== '') ? $envToken : null;
    }

    private function configHasToken(TelegramBotConfig $config): bool
    {
        $token = $config->bot_token_encrypted;

        return $token !== null && $token !== '';
    }

    private function resolveChatIdForAccount(Account $account, ?string $override): ?string
    {
        if ($override !== null && $override !== '') {
            return $override;
        }

        $config = $this->getConfigForAccount($account);

        if ($config?->chat_id) {
            return $config->chat_id;
        }

        $fallback = config('telegram.default_chat_id');

        return ($fallback !== null && $fallback !== '') ? $fallback : null;
    }

    private function eventFlagAllowsNotify(TelegramBotConfig $config, string $eventFlagKey): bool
    {
        return match ($eventFlagKey) {
            'departure'  => $config->notify_shipment_created || $config->notify_status_changed,
            'checkpoint' => $config->notify_checkpoint_added || $config->notify_status_changed,
            'delivery',
            'delay',
            'customs'    => $config->notify_status_changed,
            'payment',
            'docs'       => false,
            default      => false,
        };
    }

    /**
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

    /**
     * @return array{success: false, message: string, telegram_message_id: null, error: string}
     */
    private function skipped(string $message): array
    {
        return [
            'success' => false,
            'message' => $message,
            'telegram_message_id' => null,
            'error' => 'skipped',
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
