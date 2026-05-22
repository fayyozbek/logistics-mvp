<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreShipmentRequest;
use App\Http\Requests\UpdateShipmentStatusRequest;
use App\Http\Resources\ShipmentResource;
use App\Models\Checkpoint;
use App\Models\Shipment;
use App\Services\TelegramBotService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShipmentController extends Controller
{
    public function __construct(private TelegramBotService $telegram) {}

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

    public function updateStatus(UpdateShipmentStatusRequest $request, Shipment $shipment): JsonResponse
    {
        $validated  = $request->validated();
        $oldStatus  = $shipment->status;
        $newStatus  = $validated['status'];

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

        $shipment->load(['client', 'manager', 'checkpoints', 'financeRecord']);

        // Send Telegram notification — failure must not affect the HTTP response.
        $eventFlag = match ($newStatus) {
            'in_transit'    => 'departure',
            'at_checkpoint' => 'checkpoint',
            'delivered'     => 'delivery',
            'delayed'       => 'delay',
            default         => null,
        };

        if ($eventFlag !== null && $this->telegram->shouldNotifyForShipment($shipment, $eventFlag)) {
            $this->telegram->sendShipmentStatusChangedNotification($shipment, $oldStatus, $newStatus);
        }

        return response()->json([
            'shipment' => (new ShipmentResource($shipment))->resolve(),
        ]);
    }

    public function store(StoreShipmentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $shipment = DB::transaction(function () use ($validated) {
            $shipment = Shipment::query()->create([
                'tracking_number' => $validated['trackingNumber'] ?? $this->generateTrackingNumber(),
                'transport_type' => $validated['type'],
                'status' => $validated['status'] ?? 'planned',
                'client_id' => $validated['clientId'],
                'manager_id' => $validated['managerId'] ?? null,
                'origin' => $validated['origin'],
                'destination' => $validated['destination'],
                'cargo' => $validated['cargo'] ?? null,
                'weight' => $validated['weight'] ?? null,
                'volume' => $validated['volume'] ?? null,
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

        // Send Telegram notification — failure must not affect the HTTP response.
        if ($this->telegram->shouldNotifyForShipment($shipment, 'departure')) {
            $this->telegram->sendShipmentCreatedNotification($shipment);
        }

        return response()->json([
            'shipment' => (new ShipmentResource($shipment))->resolve(),
        ], 201);
    }

    private function generateTrackingNumber(): string
    {
        $year = now()->year;
        $prefix = "LGX-{$year}-";

        $latest = Shipment::query()
            ->where('tracking_number', 'like', $prefix.'%')
            ->orderByDesc('tracking_number')
            ->value('tracking_number');

        $next = 1;
        if (is_string($latest) && preg_match('/-(\d+)$/', $latest, $matches)) {
            $next = (int) $matches[1] + 1;
        }

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
