<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreManagerRequest;
use App\Http\Requests\UpdateManagerRequest;
use App\Http\Resources\ClientResource;
use App\Http\Resources\ManagerResource;
use App\Http\Resources\ShipmentResource;
use App\Models\Client;
use App\Models\Manager;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class ManagerController extends Controller
{
    /** @var list<string> */
    private const ACTIVE_SHIPMENT_STATUSES = ['planned', 'in_transit', 'at_checkpoint', 'delayed'];

    public function index(): JsonResponse
    {
        return response()->json([
            'managers' => ManagerResource::collection($this->managersQuery()->get())->resolve(),
        ]);
    }

    /**
     * Legacy bundle for the Managers page (managers + clients + shipments).
     */
    public function overview(): JsonResponse
    {
        $shipments = Shipment::query()
            ->with(['client', 'manager'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'managers' => ManagerResource::collection($this->managersQuery()->get())->resolve(),
            'clients' => ClientResource::collection(
                Client::query()->orderBy('company')->get(),
            )->resolve(),
            'shipments' => ShipmentResource::collection($shipments)->resolve(),
        ]);
    }

    public function show(Manager $manager): JsonResponse
    {
        $manager->loadCount([
            'shipments',
            'shipments as active_shipments_count' => fn ($query) => $query->whereIn('status', self::ACTIVE_SHIPMENT_STATUSES),
        ]);

        return response()->json([
            'manager' => (new ManagerResource($manager))->resolve(),
        ]);
    }

    public function store(StoreManagerRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $name = $validated['name'];

        $manager = Manager::query()->create([
            'name' => $name,
            'avatar' => $validated['avatar'] ?? $this->initialsAvatar($name),
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'telegram_id' => $validated['telegramId'] ?? null,
            'region' => $validated['region'] ?? null,
            'role' => $validated['role'] ?? null,
            'department' => $validated['department'] ?? null,
        ]);

        $manager->loadCount([
            'shipments',
            'shipments as active_shipments_count' => fn ($query) => $query->whereIn('status', self::ACTIVE_SHIPMENT_STATUSES),
        ]);

        return response()->json([
            'manager' => (new ManagerResource($manager))->resolve(),
        ], 201);
    }

    public function update(UpdateManagerRequest $request, Manager $manager): JsonResponse
    {
        $manager->update($this->mapUpdateAttributes($request->validated()));

        $manager->loadCount([
            'shipments',
            'shipments as active_shipments_count' => fn ($query) => $query->whereIn('status', self::ACTIVE_SHIPMENT_STATUSES),
        ]);

        return response()->json([
            'manager' => (new ManagerResource($manager->fresh()))->resolve(),
        ]);
    }

    public function destroy(Manager $manager): JsonResponse
    {
        if ($this->hasActiveShipments($manager)) {
            throw ValidationException::withMessages([
                'manager' => ['Cannot delete manager while active shipments are assigned to this record.'],
            ]);
        }

        $managerId = (string) $manager->id;
        $manager->delete();

        return response()->json([
            'message' => 'Manager deleted.',
            'managerId' => $managerId,
        ]);
    }

    private function managersQuery()
    {
        return Manager::query()
            ->withCount([
                'shipments',
                'shipments as active_shipments_count' => fn ($query) => $query->whereIn('status', self::ACTIVE_SHIPMENT_STATUSES),
            ])
            ->orderBy('name');
    }

    private function hasActiveShipments(Manager $manager): bool
    {
        return $manager->shipments()
            ->whereIn('status', self::ACTIVE_SHIPMENT_STATUSES)
            ->exists();
    }

    private function initialsAvatar(string $name): string
    {
        $parts = preg_split('/\s+/u', trim($name)) ?: [];

        if (count($parts) >= 2) {
            return mb_strtoupper(mb_substr($parts[0], 0, 1).mb_substr($parts[1], 0, 1));
        }

        return mb_strtoupper(mb_substr($name, 0, 2));
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function mapUpdateAttributes(array $validated): array
    {
        $attributes = [];

        foreach ([
            'name' => 'name',
            'avatar' => 'avatar',
            'email' => 'email',
            'phone' => 'phone',
            'telegramId' => 'telegram_id',
            'region' => 'region',
            'role' => 'role',
            'department' => 'department',
        ] as $input => $column) {
            if (array_key_exists($input, $validated)) {
                $attributes[$column] = $validated[$input];
            }
        }

        return $attributes;
    }
}
