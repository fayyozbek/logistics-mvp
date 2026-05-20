<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShipmentResource;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShipmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Shipment::query()
            ->with(['client', 'manager', 'checkpoints', 'financeRecord'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('type')) {
            $query->where('transport_type', $request->string('type'));
        }

        return response()->json([
            'shipments' => ShipmentResource::collection($query->get())->resolve(),
        ]);
    }

    public function show(Shipment $shipment): JsonResponse
    {
        $shipment->load(['client', 'manager', 'checkpoints', 'financeRecord']);

        return response()->json([
            'shipment' => (new ShipmentResource($shipment))->resolve(),
        ]);
    }
}
