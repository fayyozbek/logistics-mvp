<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendTestMessageRequest;
use App\Http\Requests\UpdateTelegramSettingsRequest;
use App\Http\Resources\ShipmentResource;
use App\Http\Resources\TelegramSettingResource;
use App\Models\Shipment;
use App\Models\TelegramSetting;
use App\Services\TelegramBotService;
use Illuminate\Http\JsonResponse;

class TelegramSettingController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /api/telegram/settings
    // -------------------------------------------------------------------------

    public function show(): JsonResponse
    {
        $setting = TelegramSetting::query()->first();

        $shipments = Shipment::query()
            ->where('telegram_notifications', true)
            ->with(['client', 'manager'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'settings' => $setting
                ? (new TelegramSettingResource($setting))->resolve()
                : null,
            'shipments' => ShipmentResource::collection($shipments)->resolve(),
        ]);
    }

    // -------------------------------------------------------------------------
    // PATCH /api/telegram/settings
    // -------------------------------------------------------------------------

    public function update(UpdateTelegramSettingsRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $setting = TelegramSetting::query()->firstOrFail();

        $updates = [];

        if (array_key_exists('chatId', $validated)) {
            $updates['chat_id'] = $validated['chatId'];
        }

        if (array_key_exists('connected', $validated)) {
            $updates['connected'] = $validated['connected'];
        }

        // Accept a new bot token only when the user explicitly submits one
        // (non-empty and not the masked placeholder returned by the API).
        $botToken = $validated['botToken'] ?? null;
        if (is_string($botToken) && $botToken !== '' && ! str_contains($botToken, '•')) {
            $updates['bot_token'] = $botToken;
        }

        if (array_key_exists('eventFlags', $validated)) {
            $updates['event_flags'] = $validated['eventFlags'];
        }

        if ($updates !== []) {
            $setting->update($updates);
        }

        $setting->refresh();

        return response()->json([
            'settings' => (new TelegramSettingResource($setting))->resolve(),
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/telegram/status
    // -------------------------------------------------------------------------

    /**
     * Returns a safe, token-free status summary for the Telegram integration.
     *
     * Response shape:
     * {
     *   "configured":            bool  – bot token is available (env or DB)
     *   "enabled":               bool  – connected flag in settings row
     *   "hasChatId":             bool  – a chat ID is configured
     *   "notificationsEnabled":  bool  – connected AND at least one event flag on
     *   "botTokenSource":        "env"|null  – never reveals DB token presence
     * }
     */
    public function status(TelegramBotService $telegram): JsonResponse
    {
        $setting    = TelegramSetting::query()->first();
        $eventFlags = $setting ? ($setting->event_flags ?? []) : [];
        $connected  = $setting ? (bool) $setting->connected : false;

        $notificationsEnabled = $connected && in_array(true, $eventFlags, strict: true);

        // Reveal "env" only when TELEGRAM_BOT_TOKEN is explicitly set.
        // Never indicate whether a DB token exists.
        $envToken       = config('telegram.bot_token');
        $botTokenSource = ($envToken !== null && $envToken !== '') ? 'env' : null;

        return response()->json([
            'configured'           => $telegram->isConfigured(),
            'enabled'              => $connected,
            'hasChatId'            => $telegram->getDefaultChatId() !== null,
            'notificationsEnabled' => $notificationsEnabled,
            'botTokenSource'       => $botTokenSource,
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /api/telegram/test-message
    // -------------------------------------------------------------------------

    /**
     * Send a test Telegram message to verify bot configuration.
     *
     * Request (all optional):
     *   { "chatId": "...", "message": "..." }
     *
     * Response:
     *   { "success": bool, "message": "...", "telegram_message_id": int|null }
     *
     * HTTP status:
     *   200  – message delivered
     *   422  – missing token or chat ID (configuration issue)
     *   502  – Telegram API or network error (upstream failure)
     */
    public function testMessage(SendTestMessageRequest $request, TelegramBotService $telegram): JsonResponse
    {
        $chatId  = $request->input('chatId') ?: null;
        $message = $request->input('message');

        if ($message !== null && $message !== '') {
            // Custom message: resolve chat ID explicitly so we can return
            // a proper 422 before ever calling the service.
            $resolvedChatId = $chatId ?? $telegram->getDefaultChatId();

            if ($resolvedChatId === null) {
                return response()->json([
                    'success'              => false,
                    'message'              => 'Telegram chat ID not configured.',
                    'telegram_message_id'  => null,
                ], 422);
            }

            $result = $telegram->sendMessage($resolvedChatId, $message);
        } else {
            $result = $telegram->sendTestMessage($chatId);
        }

        if (! $result['success']) {
            $configErrors = ['missing_token', 'missing_chat_id'];
            $status = in_array($result['error'] ?? null, $configErrors) ? 422 : 502;

            return response()->json([
                'success'             => false,
                'message'             => $result['message'],
                'telegram_message_id' => null,
            ], $status);
        }

        return response()->json([
            'success'             => true,
            'message'             => $result['message'],
            'telegram_message_id' => $result['telegram_message_id'],
        ]);
    }
}
