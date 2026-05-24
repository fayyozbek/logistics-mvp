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
    public function index(): JsonResponse
    {
        $managers = Manager::query()
            ->withCount([
                'shipments',
                'shipments as active_shipments_count' => fn ($query) => $query->whereIn('status', ['planned', 'in_transit', 'at_checkpoint', 'delayed']),
            ])
            ->orderBy('name')
            ->get();

        $shipments = Shipment::query()
            ->with(['client', 'manager'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'managers' => ManagerResource::collection($managers)->resolve(),
            'clients' => ClientResource::collection(
                Client::query()->orderBy('company')->get()
            )->resolve(),
            'shipments' => ShipmentResource::collection($shipments)->resolve(),
        ]);
    }

    public function store(StoreManagerRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $manager = Manager::query()->create([
            'name' => $validated['name'],
            'avatar' => $validated['avatar'] ?? $this->avatarFromName($validated['name']),
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'telegram_id' => $validated['telegramId'] ?? null,
            'region' => $validated['region'] ?? null,
        ]);

        $manager->loadCount([
            'shipments',
            'shipments as active_shipments_count' => fn ($query) => $query->whereIn('status', ['planned', 'in_transit', 'at_checkpoint', 'delayed']),
        ]);

        return response()->json([
            'manager' => (new ManagerResource($manager))->resolve(),
        ], 201);
    }

    public function update(UpdateManagerRequest $request, Manager $manager): JsonResponse
    {
        $validated = $request->validated();

        $attributes = [];
        foreach (['name', 'avatar', 'email', 'phone', 'region'] as $field) {
            if (array_key_exists($field, $validated)) {
                $attributes[$field] = $validated[$field];
            }
        }
        if (array_key_exists('telegramId', $validated)) {
            $attributes['telegram_id'] = $validated['telegramId'];
        }

        $manager->update($attributes);

        $manager->loadCount([
            'shipments',
            'shipments as active_shipments_count' => fn ($query) => $query->whereIn('status', ['planned', 'in_transit', 'at_checkpoint', 'delayed']),
        ]);

        return response()->json([
            'manager' => (new ManagerResource($manager))->resolve(),
        ]);
    }

    public function destroy(Manager $manager): JsonResponse
    {
        if ($manager->hasActiveShipments()) {
            throw ValidationException::withMessages([
                'manager' => ['Manager is assigned to active shipments and cannot be deleted.'],
            ]);
        }

        $manager->delete();

        return response()->json([
            'message' => 'Manager deleted.',
        ]);
    }

    private function avatarFromName(string $name): string
    {
        $parts = preg_split('/\s+/u', trim($name)) ?: [];
        $initials = '';
        foreach (array_slice($parts, 0, 2) as $part) {
            $initials .= mb_strtoupper(mb_substr($part, 0, 1));
        }

        return $initials !== '' ? $initials : '?';
    }
}
