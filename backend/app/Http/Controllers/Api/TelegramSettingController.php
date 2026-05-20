<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
}
