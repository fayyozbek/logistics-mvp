<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

/**
 * Partner/client directory for shipment creation (MVP: Client model).
 */
class ClientController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'clients' => ClientResource::collection(
                Client::query()->orderBy('company')->get(),
            )->resolve(),
        ]);
    }

    public function show(Client $client): JsonResponse
    {
        return response()->json([
            'client' => (new ClientResource($client))->resolve(),
        ]);
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $client = Client::query()->create([
            'company' => $validated['company'],
            'contact' => $validated['contact'],
            'email' => $validated['email'] ?? '',
            'phone' => $validated['phone'] ?? null,
            'country' => $validated['country'] ?? null,
            'city' => $validated['city'] ?? null,
            'address' => $validated['address'] ?? null,
        ]);

        return response()->json([
            'client' => (new ClientResource($client))->resolve(),
        ], 201);
    }

    public function update(UpdateClientRequest $request, Client $client): JsonResponse
    {
        $client->update($this->mapUpdateAttributes($request->validated()));

        return response()->json([
            'client' => (new ClientResource($client->fresh()))->resolve(),
        ]);
    }

    public function destroy(Client $client): JsonResponse
    {
        if ($client->shipments()->exists()) {
            throw ValidationException::withMessages([
                'client' => ['Cannot delete partner/client while shipments reference this record.'],
            ]);
        }

        if ($client->financeRecords()->exists()) {
            throw ValidationException::withMessages([
                'client' => ['Cannot delete partner/client while finance records reference this record.'],
            ]);
        }

        $clientId = (string) $client->id;
        $client->delete();

        return response()->json([
            'message' => 'Partner/client deleted.',
            'clientId' => $clientId,
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function mapUpdateAttributes(array $validated): array
    {
        $attributes = [];

        foreach ([
            'company' => 'company',
            'contact' => 'contact',
            'email' => 'email',
            'phone' => 'phone',
            'country' => 'country',
            'city' => 'city',
            'address' => 'address',
        ] as $input => $column) {
            if (array_key_exists($input, $validated)) {
                $attributes[$column] = $validated[$input];
            }
        }

        return $attributes;
    }
}
