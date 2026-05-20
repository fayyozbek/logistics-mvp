<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClientResource;
use App\Http\Resources\ManagerResource;
use App\Http\Resources\ShipmentResource;
use App\Models\Manager;
use Illuminate\Http\JsonResponse;
class ManagerController extends Controller
{
    public function index(): JsonResponse
    {
        $managers = Manager::query()
            ->withCount([
                'shipments',
                'shipments as active_shipments_count' => fn ($query) => $query->whereIn('status', ['planned', 'in_transit', 'at_checkpoint', 'delayed']),
            ])
            ->orderBy('name')
            ->get();

        $shipments = \App\Models\Shipment::query()
            ->with(['client', 'manager'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'managers' => ManagerResource::collection($managers)->resolve(),
            'clients' => ClientResource::collection(
                \App\Models\Client::query()->orderBy('company')->get()
            )->resolve(),
            'shipments' => ShipmentResource::collection($shipments)->resolve(),
        ]);
    }
}
