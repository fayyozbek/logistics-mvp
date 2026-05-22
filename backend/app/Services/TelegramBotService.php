<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Checkpoint;
use App\Models\Shipment;
use App\Models\TelegramBotConfig;
use App\Models\TelegramNotificationLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

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

    private const MESSAGE_PREVIEW_MAX_LENGTH = 200;

    private const ERROR_MESSAGE_MAX_LENGTH = 255;

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
        return $this->sendMessageForAccount(
            $this->currentAccount(),
            $text,
            $chatId,
            TelegramNotificationLog::EVENT_TEST_MESSAGE,
        );
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
    public function sendMessageForAccount(
        Account $account,
        string $text,
        ?string $chatId = null,
        string $eventType = TelegramNotificationLog::EVENT_TEST_MESSAGE,
        ?string $relatedType = null,
        ?int $relatedId = null,
    ): array {
        return $this->dispatchSendForAccount(
            $account,
            $text,
            $chatId,
            $eventType,
            $relatedType,
            $relatedId,
        );
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

        return $this->dispatchSendForAccount(
            $account,
            $text,
            $chatId,
            TelegramNotificationLog::EVENT_TEST_MESSAGE,
        );
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

        return $this->dispatchSendForAccount(
            $account,
            $text,
            $this->resolveChatIdForAccount($account, null),
            TelegramNotificationLog::EVENT_SHIPMENT_CREATED,
            'shipment',
            $shipment->id,
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

        return $this->dispatchSendForAccount(
            $account,
            $text,
            $this->resolveChatIdForAccount($account, null),
            TelegramNotificationLog::EVENT_SHIPMENT_STATUS_CHANGED,
            'shipment',
            $shipment->id,
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

        return $this->dispatchSendForAccount(
            $account,
            $text,
            $this->resolveChatIdForAccount($account, null),
            TelegramNotificationLog::EVENT_CHECKPOINT_ADDED,
            'checkpoint',
            $checkpoint->id,
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
    // Send + journal
    // -------------------------------------------------------------------------

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    private function dispatchSendForAccount(
        Account $account,
        string $text,
        ?string $chatId,
        string $eventType,
        ?string $relatedType = null,
        ?int $relatedId = null,
    ): array {
        $config = $this->getConfigForAccount($account);
        $preview = $this->messagePreview($text);
        $resolvedChatId = $this->resolveChatIdForAccount($account, $chatId);

        if ($config !== null && ! $config->enabled) {
            $result = $this->skipped('Telegram bot is disabled for this account.');
            $this->recordNotificationLog(
                $account,
                $config,
                $eventType,
                $relatedType,
                $relatedId,
                $resolvedChatId,
                $preview,
                $result,
            );

            return $result;
        }

        $token = $this->resolveTokenForAccount($account);

        if ($token === null) {
            $result = $this->failure('Telegram bot token not configured.', 'missing_token');
            $this->recordNotificationLog(
                $account,
                $config,
                $eventType,
                $relatedType,
                $relatedId,
                $resolvedChatId,
                $preview,
                $result,
            );

            return $result;
        }

        if ($resolvedChatId === null || $resolvedChatId === '') {
            $result = $this->failure('Telegram chat ID not configured.', 'missing_chat_id');
            $this->recordNotificationLog(
                $account,
                $config,
                $eventType,
                $relatedType,
                $relatedId,
                $resolvedChatId,
                $preview,
                $result,
            );

            return $result;
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
                $result = $this->failure(
                    $body['description'] ?? 'Telegram API returned an error.',
                    'api_error',
                );
                $this->recordNotificationLog(
                    $account,
                    $config,
                    $eventType,
                    $relatedType,
                    $relatedId,
                    $resolvedChatId,
                    $preview,
                    $result,
                );

                return $result;
            }

            $result = [
                'success' => true,
                'message' => 'Message sent successfully.',
                'telegram_message_id' => isset($body['result']['message_id'])
                    ? (int) $body['result']['message_id']
                    : null,
                'error' => null,
            ];

            $this->recordNotificationLog(
                $account,
                $config,
                $eventType,
                $relatedType,
                $relatedId,
                $resolvedChatId,
                $preview,
                $result,
            );

            return $result;
        } catch (\Throwable $e) {
            Log::warning('TelegramBotService: failed to deliver message.', [
                'account_id' => $account->id,
                'chat_id' => $resolvedChatId,
                'error' => $e->getMessage(),
            ]);

            $result = $this->failure(
                'Failed to send Telegram message: network or connection error.',
                'network_error',
            );
            $this->recordNotificationLog(
                $account,
                $config,
                $eventType,
                $relatedType,
                $relatedId,
                $resolvedChatId,
                $preview,
                $result,
            );

            return $result;
        }
    }

    /**
     * @param  array{success: bool, message: string, telegram_message_id: int|null, error: string|null}  $result
     */
    private function recordNotificationLog(
        Account $account,
        ?TelegramBotConfig $config,
        string $eventType,
        ?string $relatedType,
        ?int $relatedId,
        ?string $chatId,
        string $messagePreview,
        array $result,
    ): void {
        $status = $this->logStatusFromResult($result);
        $sentAt = $status === TelegramNotificationLog::STATUS_SENT ? now() : null;

        TelegramNotificationLog::query()->create([
            'account_id' => $account->id,
            'telegram_bot_config_id' => $config?->id,
            'event_type' => $eventType,
            'related_type' => $relatedType,
            'related_id' => $relatedId,
            'chat_id' => $chatId,
            'message_preview' => $messagePreview,
            'status' => $status,
            'telegram_message_id' => $result['telegram_message_id'] !== null
                ? (string) $result['telegram_message_id']
                : null,
            'error_message' => $status === TelegramNotificationLog::STATUS_SENT
                ? null
                : $this->safeErrorMessage($result['message']),
            'sent_at' => $sentAt,
        ]);
    }

    /**
     * @param  array{success: bool, message: string, telegram_message_id: int|null, error: string|null}  $result
     */
    private function logStatusFromResult(array $result): string
    {
        if ($result['success']) {
            return TelegramNotificationLog::STATUS_SENT;
        }

        if (($result['error'] ?? null) === 'skipped') {
            return TelegramNotificationLog::STATUS_SKIPPED;
        }

        return TelegramNotificationLog::STATUS_FAILED;
    }

    private function messagePreview(string $text): string
    {
        return Str::limit($text, self::MESSAGE_PREVIEW_MAX_LENGTH, '…');
    }

    private function safeErrorMessage(string $message): string
    {
        $redacted = preg_replace('/token/i', '[redacted]', $message) ?? $message;

        return Str::limit(trim($redacted), self::ERROR_MESSAGE_MAX_LENGTH, '…');
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
