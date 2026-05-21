<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreShipmentRequest;
use App\Http\Requests\UpdateShipmentRequest;
use App\Http\Requests\UpdateShipmentStatusRequest;
use App\Http\Resources\ShipmentResource;
use App\Models\Checkpoint;
use App\Models\Shipment;
use App\Services\TrackingNumberGenerator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShipmentController extends Controller
{
    public function __construct(
        private readonly TrackingNumberGenerator $trackingNumberGenerator,
    ) {}
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

    public function update(UpdateShipmentRequest $request, Shipment $shipment): JsonResponse
    {
        $shipment->update($this->mapUpdateAttributes($request->validated()));
        $shipment->load(['client', 'manager', 'checkpoints', 'financeRecord']);

        return response()->json([
            'shipment' => (new ShipmentResource($shipment))->resolve(),
        ]);
    }

    public function destroy(Shipment $shipment): JsonResponse
    {
        DB::transaction(function () use ($shipment): void {
            $shipment->delete();
        });

        return response()->json([
            'message' => 'Shipment deleted.',
            'shipmentId' => (string) $shipment->id,
        ]);
    }

    public function updateStatus(UpdateShipmentStatusRequest $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validated();

        $shipment->update(['status' => $validated['status']]);

        if (! empty($validated['note'])) {
            $checkpoint = $shipment->checkpoints()
                ->where('status', 'current')
                ->orderBy('sequence')
                ->first()
                ?? $shipment->checkpoints()->orderByDesc('sequence')->first();

            if ($checkpoint) {
                $checkpoint->update(['note' => $validated['note']]);
            }
        }

        $shipment->load(['client', 'manager', 'checkpoints', 'financeRecord']);

        return response()->json([
            'shipment' => (new ShipmentResource($shipment))->resolve(),
        ]);
    }

    public function store(StoreShipmentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $shipment = DB::transaction(function () use ($validated) {
            $shipment = Shipment::query()->create([
                'tracking_number' => $validated['trackingNumber'] ?? $this->trackingNumberGenerator->next(),
                'transport_type' => $validated['type'],
                'status' => $validated['status'] ?? 'planned',
                'client_id' => $validated['clientId'],
                'manager_id' => $validated['managerId'] ?? null,
                'origin' => $validated['origin'],
                'destination' => $validated['destination'],
                'cargo' => $validated['cargo'] ?? null,
                'weight' => $validated['weight'] ?? null,
                'weight_unit' => isset($validated['weight']) ? ($validated['weightUnit'] ?? 'kg') : null,
                'volume' => $validated['volume'] ?? null,
                'volume_unit' => isset($validated['volume']) ? ($validated['volumeUnit'] ?? 'm3') : null,
                'estimated_delivery' => $validated['estimatedDelivery'] ?? null,
                'telegram_notifications' => $validated['telegramNotifications'] ?? false,
            ]);

            foreach ($validated['checkpoints'] ?? [] as $index => $checkpoint) {
                Checkpoint::query()->create([
                    'shipment_id' => $shipment->id,
                    'sequence' => $index + 1,
                    'city' => $checkpoint['city'],
                    'country' => $checkpoint['country'] ?? null,
                    'address' => $checkpoint['address'],
                    'planned_at' => Carbon::parse($checkpoint['plannedAt']),
                    'arrived_at' => isset($checkpoint['arrivedAt'])
                        ? Carbon::parse($checkpoint['arrivedAt'])
                        : null,
                    'status' => $checkpoint['status'] ?? 'upcoming',
                    'note' => $checkpoint['note'] ?? null,
                ]);
            }

            return $shipment;
        });

        $shipment->load(['client', 'manager', 'checkpoints', 'financeRecord']);

        return response()->json([
            'shipment' => (new ShipmentResource($shipment))->resolve(),
        ], 201);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function mapUpdateAttributes(array $validated): array
    {
        $attributes = [];

        $fieldMap = [
            'clientId' => 'client_id',
            'managerId' => 'manager_id',
            'type' => 'transport_type',
            'origin' => 'origin',
            'destination' => 'destination',
            'cargo' => 'cargo',
            'weight' => 'weight',
            'weightUnit' => 'weight_unit',
            'volume' => 'volume',
            'volumeUnit' => 'volume_unit',
            'plannedPickup' => 'planned_pickup',
            'estimatedDelivery' => 'estimated_delivery',
            'notes' => 'notes',
            'telegramNotifications' => 'telegram_notifications',
        ];

        foreach ($fieldMap as $input => $column) {
            if (array_key_exists($input, $validated)) {
                $attributes[$column] = $validated[$input];
            }
        }

        return $attributes;
    }
}
