<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTelegramSettingsRequest;
use App\Http\Resources\ShipmentResource;
use App\Http\Resources\TelegramSettingResource;
use App\Models\Shipment;
use App\Models\TelegramSetting;
use Illuminate\Http\JsonResponse;

class TelegramSettingController extends Controller
{
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
}
