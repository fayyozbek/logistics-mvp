<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendTestMessageRequest;
use App\Http\Requests\UpdateTelegramSettingsRequest;
use App\Http\Resources\ShipmentResource;
use App\Http\Resources\TelegramNotificationSettingResource;
use App\Models\Shipment;
use App\Services\TelegramBotService;
use Illuminate\Http\JsonResponse;

class TelegramSettingController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /api/telegram/settings
    // -------------------------------------------------------------------------

    public function show(TelegramBotService $telegram): JsonResponse
    {
        $setting = $telegram->getCurrentSetting();

        $shipments = Shipment::query()
            ->where('telegram_notifications', true)
            ->withSummaryRelations()
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'settings' => $setting
                ? (new TelegramNotificationSettingResource($setting))->resolve()
                : null,
            'shipments' => ShipmentResource::collection($shipments)->resolve(),
        ]);
    }

    // -------------------------------------------------------------------------
    // PATCH /api/telegram/settings
    // -------------------------------------------------------------------------

    public function update(
        UpdateTelegramSettingsRequest $request,
        TelegramBotService $telegram,
    ): JsonResponse {
        $validated = $request->validated();

        $updates = [];

        foreach ($this->settingFieldMap() as $inputKey => $column) {
            if (array_key_exists($inputKey, $validated)) {
                $updates[$column] = $validated[$inputKey];
            }
        }

        $setting = $telegram->updateCurrentSetting($updates);

        return response()->json([
            'settings' => (new TelegramNotificationSettingResource($setting))->resolve(),
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/telegram/status
    // -------------------------------------------------------------------------

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

        $setting = $telegram->getCurrentSetting();
        if ($setting !== null) {
            $setting->update([
                'last_tested_at' => now(),
                'last_test_status' => $result['success']
                    ? 'sent'
                    : (($result['error'] ?? null) === 'skipped' ? 'skipped' : 'failed'),
            ]);
        }

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

    /**
     * @return array<string, string>
     */
    private function settingFieldMap(): array
    {
        return [
            'displayName' => 'display_name',
            'telegramChatId' => 'telegram_chat_id',
            'telegramUsername' => 'telegram_username',
            'enabled' => 'enabled',
            'notificationsEnabled' => 'notifications_enabled',
            'notifyShipmentCreated' => 'notify_shipment_created',
            'notifyStatusChanged' => 'notify_status_changed',
            'notifyCheckpointAdded' => 'notify_checkpoint_added',
        ];
    }
}
