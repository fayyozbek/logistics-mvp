<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class ClientController extends Controller
{
    public function index(): JsonResponse
    {
        $clients = Client::query()->orderBy('company')->get();

        return response()->json([
            'clients' => ClientResource::collection($clients)->resolve(),
        ]);
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        $client = Client::query()->create($this->mapClientAttributes($request->validated()));

        return response()->json([
            'client' => (new ClientResource($client))->resolve(),
        ], 201);
    }

    public function update(UpdateClientRequest $request, Client $client): JsonResponse
    {
        $client->update($this->mapClientAttributes($request->validated(), onlyProvided: true));

        return response()->json([
            'client' => (new ClientResource($client->fresh()))->resolve(),
        ]);
    }

    public function destroy(Client $client): JsonResponse
    {
        if ($client->isReferenced()) {
            throw ValidationException::withMessages([
                'client' => ['Client is linked to shipments or finance records and cannot be deleted.'],
            ]);
        }

        $client->delete();

        return response()->json([
            'message' => 'Client deleted.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function mapClientAttributes(array $validated, bool $onlyProvided = false): array
    {
        $attributes = [];

        if (! $onlyProvided || array_key_exists('company', $validated)) {
            $attributes['company'] = $validated['company'] ?? null;
        }

        if (! $onlyProvided || array_key_exists('contact', $validated) || array_key_exists('contactName', $validated)) {
            $attributes['contact'] = $validated['contact'] ?? $validated['contactName'] ?? ($onlyProvided ? null : '');
        }

        foreach (['email', 'phone', 'country'] as $field) {
            if (! $onlyProvided || array_key_exists($field, $validated)) {
                $attributes[$field] = $validated[$field] ?? ($onlyProvided ? null : null);
            }
        }

        if (! $onlyProvided) {
            $attributes['contact'] ??= '';
            $attributes['email'] ??= '';
        }

        return array_filter(
            $attributes,
            fn ($value) => $value !== null,
        );
    }
}
