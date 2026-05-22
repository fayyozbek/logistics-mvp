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
     */
    public function status(TelegramBotService $telegram): JsonResponse
    {
        $notificationSetting = $telegram->getCurrentSetting();

        $enabled = $notificationSetting ? (bool) $notificationSetting->enabled : false;

        $notificationsEnabled = $notificationSetting
            && $enabled
            && $notificationSetting->notifications_enabled
            && (
                $notificationSetting->notify_shipment_created
                || $notificationSetting->notify_status_changed
                || $notificationSetting->notify_checkpoint_added
            );

        return response()->json([
            'configured'           => $telegram->isConfigured(),
            'enabled'              => $enabled,
            'hasChatId'            => $telegram->getDefaultChatId() !== null,
            'notificationsEnabled' => (bool) $notificationsEnabled,
            'botTokenSource'       => $telegram->tokenSource(),
            'botUsername'          => $notificationSetting?->telegram_username,
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /api/telegram/test-message
    // -------------------------------------------------------------------------

    public function testMessage(
        SendTestMessageRequest $request,
        TelegramBotService $telegram,
    ): JsonResponse {
        $chatId  = $request->input('chatId') ?: null;
        $message = $request->input('message');

        $result = ($message !== null && $message !== '')
            ? $telegram->sendMessage($message, $chatId)
            : $telegram->sendTestMessage(null, $chatId);

        if (! $result['success']) {
            $configErrors = ['missing_token', 'missing_chat_id', 'skipped'];
            $status = in_array($result['error'] ?? null, $configErrors, true) ? 422 : 502;

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
