<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShipmentResource;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;

class TrackingController extends Controller
{
    public function index(): JsonResponse
    {
        $shipments = Shipment::query()
            ->with(['client', 'manager', 'checkpoints', 'financeRecord'])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'shipments' => ShipmentResource::collection($shipments)->resolve(),
        ]);
    }
}
