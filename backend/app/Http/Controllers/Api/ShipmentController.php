<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreShipmentRequest;
use App\Http\Requests\UpdateShipmentRequest;
use App\Http\Requests\UpdateShipmentStatusRequest;
use App\Http\Resources\ShipmentResource;
use App\Models\Checkpoint;
use App\Models\Shipment;
use App\Services\ShipmentFinanceSyncService;
use App\Services\TelegramBotService;
use App\Services\TrackingNumberGenerator;
use App\Support\ShipmentCurrencies;
use App\Support\MapsValidatedAttributes;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShipmentController extends Controller
{
    use MapsValidatedAttributes;

    private const UPDATE_FIELD_MAP = [
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
        'priceAmount' => 'price_amount',
        'currency' => 'currency',
    ];

    public function __construct(
        private readonly TrackingNumberGenerator $trackingNumberGenerator,
        private readonly TelegramBotService $telegram,
        private readonly ShipmentFinanceSyncService $shipmentFinanceSync,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Shipment::query()
            ->withDetailRelations()
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
        return $this->shipmentResponse($this->loadShipmentDetails($shipment));
    }

    public function update(UpdateShipmentRequest $request, Shipment $shipment): JsonResponse
    {
        $shipment->update($this->mapValidatedAttributes($request->validated(), self::UPDATE_FIELD_MAP));
        $this->shipmentFinanceSync->syncFromShipment($shipment->fresh());

        return $this->shipmentResponse($this->loadShipmentDetails($shipment));
    }

    public function destroy(Shipment $shipment): JsonResponse
    {
        DB::transaction(function () use ($shipment): void {
            $shipment->delete();
        });

        return response()->json([
            'message' => 'Shipment archived.',
            'shipmentId' => (string) $shipment->id,
        ]);
    }

    public function updateStatus(UpdateShipmentStatusRequest $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validated();
        $oldStatus = $shipment->status;
        $newStatus = $validated['status'];

        $shipment->update(['status' => $newStatus]);

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

        $shipment = $this->loadShipmentDetails($shipment);

        $eventFlag = match ($newStatus) {
            'in_transit' => 'departure',
            'at_checkpoint' => 'checkpoint',
            'delivered' => 'delivery',
            'delayed' => 'delay',
            default => null,
        };

        if ($eventFlag !== null && $this->telegram->shouldNotifyForShipment($shipment, $eventFlag)) {
            $this->telegram->sendShipmentStatusChangedNotification($shipment, $oldStatus, $newStatus);
        }

        return $this->shipmentResponse($shipment);
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
                'price_amount' => $validated['priceAmount'] ?? 0,
                'currency' => $validated['currency'] ?? ShipmentCurrencies::DEFAULT,
            ]);

            $this->createCheckpointsFromPayload($shipment, $validated['checkpoints'] ?? []);
            $this->shipmentFinanceSync->syncFromShipment($shipment);

            return $shipment;
        });

        $shipment = $this->loadShipmentDetails($shipment);

        if ($this->telegram->shouldNotifyForShipment($shipment, 'departure')) {
            $this->telegram->sendShipmentCreatedNotification($shipment);
        }

        return $this->shipmentResponse($shipment, 201);
    }

    private function loadShipmentDetails(Shipment $shipment): Shipment
    {
        return $shipment->load(Shipment::detailRelations());
    }

    private function shipmentResponse(Shipment $shipment, int $status = 200): JsonResponse
    {
        return response()->json([
            'shipment' => (new ShipmentResource($shipment))->resolve(),
        ], $status);
    }

    /**
     * @param  list<array<string, mixed>>  $checkpoints
     */
    private function createCheckpointsFromPayload(Shipment $shipment, array $checkpoints): void
    {
        foreach ($checkpoints as $index => $checkpoint) {
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
    }
}
