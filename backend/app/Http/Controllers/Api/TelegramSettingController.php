<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTelegramSettingsRequest;
use App\Http\Resources\ShipmentResource;
use App\Http\Resources\TelegramSettingResource;
use App\Models\Shipment;
use App\Models\TelegramSetting;
use App\Support\MapsValidatedAttributes;
use Illuminate\Http\JsonResponse;

class TelegramSettingController extends Controller
{
    use MapsValidatedAttributes;

    public function show(): JsonResponse
    {
        $setting = TelegramSetting::query()->first();

        $shipments = Shipment::query()
            ->where('telegram_notifications', true)
            ->withSummaryRelations()
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
        $updates = $this->buildSettingsUpdates($validated);

        if ($updates !== []) {
            $setting->update($updates);
        }

        $setting->refresh();

        return response()->json([
            'settings' => (new TelegramSettingResource($setting))->resolve(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function buildSettingsUpdates(array $validated): array
    {
        $updates = $this->mapValidatedAttributes($validated, [
            'chatId' => 'chat_id',
            'connected' => 'connected',
        ]);

        $botToken = $validated['botToken'] ?? null;
        if (is_string($botToken) && $botToken !== '' && ! str_contains($botToken, '•')) {
            $updates['bot_token'] = $botToken;
        }

        if (array_key_exists('eventFlags', $validated)) {
            $updates['event_flags'] = $validated['eventFlags'];
        }

        return $updates;
    }
}
