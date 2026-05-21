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
use App\Support\MapsValidatedAttributes;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class ManagerController extends Controller
{
    use MapsValidatedAttributes;

    private const UPDATE_FIELD_MAP = [
        'name' => 'name',
        'avatar' => 'avatar',
        'email' => 'email',
        'phone' => 'phone',
        'telegramId' => 'telegram_id',
        'region' => 'region',
        'role' => 'role',
        'department' => 'department',
    ];

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
            ->withSummaryRelations()
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
        $this->loadManagerCounts($manager);

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

        $this->loadManagerCounts($manager);

        return response()->json([
            'manager' => (new ManagerResource($manager))->resolve(),
        ], 201);
    }

    public function update(UpdateManagerRequest $request, Manager $manager): JsonResponse
    {
        $manager->update($this->mapValidatedAttributes($request->validated(), self::UPDATE_FIELD_MAP));

        $manager = $manager->fresh();
        $this->loadManagerCounts($manager);

        return response()->json([
            'manager' => (new ManagerResource($manager))->resolve(),
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
            ->withCount($this->managerCountRelations())
            ->orderBy('name');
    }

    private function loadManagerCounts(Manager $manager): void
    {
        $manager->loadCount($this->managerCountRelations());
    }

    /**
     * @return array<string, mixed>
     */
    private function managerCountRelations(): array
    {
        return [
            'shipments',
            'shipments as active_shipments_count' => fn ($query) => $query->whereIn('status', Shipment::ACTIVE_STATUSES),
        ];
    }

    private function hasActiveShipments(Manager $manager): bool
    {
        return $manager->shipments()
            ->whereIn('status', Shipment::ACTIVE_STATUSES)
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
}
