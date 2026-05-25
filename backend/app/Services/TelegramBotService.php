<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Checkpoint;
use App\Models\Shipment;
use App\Models\TelegramNotificationLog;
use App\Models\TelegramNotificationSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Outbound Telegram Bot API notifications using one global bot token and
 * per-account notification settings (chat id + toggles).
 *
 * Token: TELEGRAM_BOT_TOKEN env / config only — never from DB.
 *
 * Chat ID priority:
 *   1. Explicit argument
 *   2. Current TelegramNotificationSetting.telegram_chat_id
 *   3. TELEGRAM_DEFAULT_CHAT_ID env / config
 */
class TelegramBotService
{
    private const API_BASE = 'https://api.telegram.org/bot';

    private const MESSAGE_PREVIEW_MAX_LENGTH = 200;

    private const ERROR_MESSAGE_MAX_LENGTH = 255;

    public function __construct(private AccountContext $accountContext) {}

    // -------------------------------------------------------------------------
    // Configuration & setting resolution
    // -------------------------------------------------------------------------

    public function isConfigured(): bool
    {
        return $this->resolveToken() !== null;
    }

    /**
     * Active notification settings for the authenticated principal.
     *
     * Resolution order:
     *   1. Authenticated user with account_id → account-scoped row
     *   2. Authenticated user without account_id → user-scoped row
     *   3. Unauthenticated → Admin Demo Account (local/demo only)
     */
    public function getCurrentSetting(): ?TelegramNotificationSetting
    {
        $scope = $this->accountContext->telegramScope();

        if ($scope['account_id'] !== null) {
            $setting = TelegramNotificationSetting::query()
                ->where('account_id', $scope['account_id'])
                ->first();

            if ($setting !== null) {
                return $setting;
            }
        }

        if ($scope['user_id'] !== null) {
            $setting = TelegramNotificationSetting::query()
                ->where('user_id', $scope['user_id'])
                ->whereNull('account_id')
                ->first();

            if ($setting !== null) {
                return $setting;
            }
        }

        if ($scope['demo']) {
            return TelegramNotificationSetting::query()
                ->where('account_id', $scope['account_id'])
                ->first();
        }

        return null;
    }

    public function getOrCreateCurrentSetting(): TelegramNotificationSetting
    {
        $scope = $this->accountContext->telegramScope();

        $defaults = [
            'enabled' => false,
            'notifications_enabled' => true,
            'notify_shipment_created' => true,
            'notify_status_changed' => true,
            'notify_checkpoint_added' => true,
        ];

        if ($scope['account_id'] !== null) {
            return TelegramNotificationSetting::query()->updateOrCreate(
                ['account_id' => $scope['account_id']],
                array_merge($defaults, [
                    'user_id' => $scope['user_id'],
                ]),
            );
        }

        if ($scope['user_id'] !== null) {
            return TelegramNotificationSetting::query()->updateOrCreate(
                [
                    'user_id' => $scope['user_id'],
                    'account_id' => null,
                ],
                $defaults,
            );
        }

        return TelegramNotificationSetting::query()->updateOrCreate(
            ['account_id' => $this->accountContext->demoAccount()->id],
            $defaults,
        );
    }

    /**
     * @param  array<string, mixed>  $attributes  Database column names.
     */
    public function updateCurrentSetting(array $attributes): TelegramNotificationSetting
    {
        $setting = $this->getOrCreateCurrentSetting();

        if ($attributes !== []) {
            $setting->update($attributes);
        }

        return $setting->refresh();
    }

    public function currentAccount(): Account
    {
        return $this->accountContext->current();
    }

    public function getDefaultChatId(): ?string
    {
        return $this->resolveChatId(null);
    }

    /**
     * @return 'env'|null
     */
    public function tokenSource(): ?string
    {
        return $this->resolveToken() !== null ? 'env' : null;
    }

    /**
     * @return 'env'|null
     *
     * @deprecated Use tokenSource(); token is global, not per account.
     */
    public function tokenSourceForAccount(Account $account): ?string
    {
        return $this->tokenSource();
    }

    /**
     * @deprecated Use isConfigured(); token is global.
     */
    public function isConfiguredForAccount(Account $account): bool
    {
        return $this->isConfigured();
    }

    /**
     * @deprecated Use getCurrentSetting().
     */
    public function getConfigForAccount(Account $account): ?TelegramNotificationSetting
    {
        return TelegramNotificationSetting::query()
            ->where('account_id', $account->id)
            ->first();
    }

    // -------------------------------------------------------------------------
    // Public send API
    // -------------------------------------------------------------------------

    /**
     * @param  array{type?: string, id?: int}|null  $related
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendMessage(
        string $text,
        ?string $chatId = null,
        ?string $eventType = null,
        ?array $related = null,
    ): array {
        return $this->dispatchSend(
            $text,
            $chatId,
            $eventType ?? TelegramNotificationLog::EVENT_TEST_MESSAGE,
            $related['type'] ?? null,
            isset($related['id']) ? (int) $related['id'] : null,
        );
    }

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendTestMessage(?string $message = null, ?string $chatId = null): array
    {
        $text = ($message !== null && $message !== '')
            ? $message
            : "✅ Проверочное сообщение от Logistix.\nУведомления Telegram настроены корректно.";

        return $this->dispatchSend(
            $text,
            $chatId,
            TelegramNotificationLog::EVENT_TEST_MESSAGE,
        );
    }

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendShipmentCreatedNotification(Shipment $shipment): array
    {
        $text = implode("\n", [
            '🚚 Новый груз создан: ' . $shipment->tracking_number,
            'Маршрут: ' . $shipment->origin . ' → ' . $shipment->destination,
            'Груз: ' . ($shipment->cargo ?? '—'),
            'Статус: ' . $this->statusLabel($shipment->status),
        ]);

        return $this->dispatchSend(
            $text,
            null,
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
    ): array {
        $text = implode("\n", [
            '🔄 Статус груза обновлён: ' . $shipment->tracking_number,
            'Было: ' . $this->statusLabel($oldStatus),
            'Стало: ' . $this->statusLabel($newStatus),
        ]);

        return $this->dispatchSend(
            $text,
            null,
            TelegramNotificationLog::EVENT_SHIPMENT_STATUS_CHANGED,
            'shipment',
            $shipment->id,
        );
    }

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    public function sendCheckpointAddedNotification(Shipment $shipment, Checkpoint $checkpoint): array
    {
        $location = trim(implode(', ', array_filter([
            $checkpoint->city,
            $checkpoint->country,
        ])));

        $text = implode("\n", [
            '📍 Новая точка маршрута: ' . $shipment->tracking_number,
            'Локация: ' . ($location ?: ($checkpoint->address ?? '—')),
            'Статус точки: ' . $this->checkpointStatusLabel($checkpoint->status),
        ]);

        return $this->dispatchSend(
            $text,
            null,
            TelegramNotificationLog::EVENT_CHECKPOINT_ADDED,
            'checkpoint',
            $checkpoint->id,
        );
    }

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     *
     * @deprecated Use sendMessage($text, $chatId, ...).
     */
    public function sendMessageForAccount(
        Account $account,
        string $text,
        ?string $chatId = null,
        string $eventType = TelegramNotificationLog::EVENT_TEST_MESSAGE,
        ?string $relatedType = null,
        ?int $relatedId = null,
    ): array {
        return $this->dispatchSend($text, $chatId, $eventType, $relatedType, $relatedId);
    }

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     *
     * @deprecated Use sendTestMessage().
     */
    public function sendTestMessageForAccount(
        Account $account,
        ?string $message = null,
        ?string $chatId = null,
    ): array {
        return $this->sendTestMessage($message, $chatId);
    }

    // -------------------------------------------------------------------------
    // Event gating
    // -------------------------------------------------------------------------

    public function shouldNotifyForShipment(Shipment $shipment, string $eventFlagKey): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        $setting = $this->getCurrentSetting();

        if ($setting === null || ! $this->settingAllowsNotifications($setting)) {
            return false;
        }

        if (! $shipment->telegram_notifications) {
            return false;
        }

        return $this->eventFlagAllowsNotify($setting, $eventFlagKey);
    }

    // -------------------------------------------------------------------------
    // Send + journal
    // -------------------------------------------------------------------------

    /**
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    private function dispatchSend(
        string $text,
        ?string $chatId,
        string $eventType,
        ?string $relatedType = null,
        ?int $relatedId = null,
    ): array {
        $setting = $this->getCurrentSetting();
        $preview = $this->messagePreview($text);
        $resolvedChatId = $this->resolveChatId($chatId);
        $scope = $this->accountContext->telegramScope();
        $accountId = $setting?->account_id ?? $scope['account_id'];

        if ($setting !== null && ! $this->settingAllowsNotifications($setting)) {
            $result = $this->skipped('Telegram notifications are disabled for this account.');

            return $this->finalizeSend(
                $setting,
                $accountId,
                $eventType,
                $relatedType,
                $relatedId,
                $resolvedChatId,
                $preview,
                $result,
            );
        }

        $token = $this->resolveToken();

        if ($token === null) {
            $result = $this->failure('Telegram bot token not configured.', 'missing_token');

            return $this->finalizeSend(
                $setting,
                $accountId,
                $eventType,
                $relatedType,
                $relatedId,
                $resolvedChatId,
                $preview,
                $result,
            );
        }

        if ($resolvedChatId === null || $resolvedChatId === '') {
            $result = $this->failure('Telegram chat ID not configured.', 'missing_chat_id');

            return $this->finalizeSend(
                $setting,
                $accountId,
                $eventType,
                $relatedType,
                $relatedId,
                $resolvedChatId,
                $preview,
                $result,
            );
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

                return $this->finalizeSend(
                    $setting,
                    $accountId,
                    $eventType,
                    $relatedType,
                    $relatedId,
                    $resolvedChatId,
                    $preview,
                    $result,
                );
            }

            $result = [
                'success' => true,
                'message' => 'Message sent successfully.',
                'telegram_message_id' => isset($body['result']['message_id'])
                    ? (int) $body['result']['message_id']
                    : null,
                'error' => null,
            ];

            return $this->finalizeSend(
                $setting,
                $accountId,
                $eventType,
                $relatedType,
                $relatedId,
                $resolvedChatId,
                $preview,
                $result,
            );
        } catch (\Throwable $e) {
            Log::warning('TelegramBotService: failed to deliver message.', [
                'account_id' => $accountId,
                'chat_id' => $resolvedChatId,
                'error' => $e->getMessage(),
            ]);

            $result = $this->failure(
                'Failed to send Telegram message: network or connection error.',
                'network_error',
            );

            return $this->finalizeSend(
                $setting,
                $accountId,
                $eventType,
                $relatedType,
                $relatedId,
                $resolvedChatId,
                $preview,
                $result,
            );
        }
    }

    /**
     * @param  array{success: bool, message: string, telegram_message_id: int|null, error: string|null}  $result
     * @return array{success: bool, message: string, telegram_message_id: int|null, error: string|null}
     */
    private function finalizeSend(
        ?TelegramNotificationSetting $setting,
        ?int $accountId,
        string $eventType,
        ?string $relatedType,
        ?int $relatedId,
        ?string $chatId,
        string $messagePreview,
        array $result,
    ): array {
        $this->recordNotificationLog(
            $setting,
            $accountId,
            $eventType,
            $relatedType,
            $relatedId,
            $chatId,
            $messagePreview,
            $result,
        );

        return $result;
    }

    /**
     * @param  array{success: bool, message: string, telegram_message_id: int|null, error: string|null}  $result
     */
    private function recordNotificationLog(
        ?TelegramNotificationSetting $setting,
        ?int $accountId,
        string $eventType,
        ?string $relatedType,
        ?int $relatedId,
        ?string $chatId,
        string $messagePreview,
        array $result,
    ): void {
        if (! Schema::hasTable('telegram_notification_logs')) {
            return;
        }

        $status = $this->logStatusFromResult($result);
        $sentAt = $status === TelegramNotificationLog::STATUS_SENT ? now() : null;
        $scope = $this->accountContext->telegramScope();

        TelegramNotificationLog::query()->create([
            'telegram_notification_setting_id' => $setting?->id,
            'account_id' => $accountId ?? $scope['account_id'],
            'user_id' => $scope['user_id'],
            'event_type' => $eventType,
            'related_type' => $relatedType,
            'related_id' => $relatedId,
            'telegram_chat_id' => $chatId,
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

    private function resolveToken(): ?string
    {
        $envToken = config('telegram.bot_token');

        return ($envToken !== null && $envToken !== '') ? $envToken : null;
    }

    private function resolveChatId(?string $override): ?string
    {
        if ($override !== null && $override !== '') {
            return $override;
        }

        $setting = $this->getCurrentSetting();

        if ($setting?->telegram_chat_id) {
            return $setting->telegram_chat_id;
        }

        $fallback = config('telegram.default_chat_id');

        return ($fallback !== null && $fallback !== '') ? $fallback : null;
    }

    private function settingAllowsNotifications(TelegramNotificationSetting $setting): bool
    {
        return $setting->enabled && $setting->notifications_enabled;
    }

    private function eventFlagAllowsNotify(TelegramNotificationSetting $setting, string $eventFlagKey): bool
    {
        return match ($eventFlagKey) {
            'departure'  => $setting->notify_shipment_created || $setting->notify_status_changed,
            'checkpoint' => $setting->notify_checkpoint_added,
            'delivery',
            'delay',
            'customs'    => $setting->notify_status_changed,
            'payment',
            'docs'       => false,
            default      => false,
        };
    }

    private function accountsTableExists(): bool
    {
        return Schema::hasTable('accounts');
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
