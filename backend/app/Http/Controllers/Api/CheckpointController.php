<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCheckpointRequest;
use App\Http\Requests\UpdateCheckpointRequest;
use App\Http\Resources\CheckpointResource;
use App\Models\Checkpoint;
use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CheckpointController extends Controller
{
    public function store(StoreCheckpointRequest $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validated();
        $insertAfter = $validated['insertAfter'] ?? -1;

        $checkpoint = DB::transaction(function () use ($shipment, $validated, $insertAfter) {
            $existing = $shipment->checkpoints()->orderBy('sequence')->get();
            $position = $insertAfter === -1
                ? $existing->count()
                : min($insertAfter + 1, $existing->count());

            $checkpoint = Checkpoint::query()->create([
                'shipment_id' => $shipment->id,
                'sequence' => 0,
                'city' => $validated['city'],
                'country' => $validated['country'] ?? null,
                'address' => $validated['address'],
                'planned_at' => Carbon::parse($validated['plannedAt']),
                'arrived_at' => isset($validated['arrivedAt'])
                    ? Carbon::parse($validated['arrivedAt'])
                    : null,
                'status' => $validated['status'] ?? 'upcoming',
                'note' => $validated['note'] ?? null,
            ]);

            $orderedIds = $existing->pluck('id')->all();
            array_splice($orderedIds, $position, 0, [$checkpoint->id]);

            foreach ($orderedIds as $index => $id) {
                Checkpoint::query()->whereKey($id)->update(['sequence' => $index + 1]);
            }

            return $checkpoint->fresh();
        });

        return response()->json([
            'checkpoint' => (new CheckpointResource($checkpoint))->resolve(),
        ], 201);
    }

    public function update(UpdateCheckpointRequest $request, Checkpoint $checkpoint): JsonResponse
    {
        $validated = $request->validated();

        $attributes = [];

        if (array_key_exists('city', $validated)) {
            $attributes['city'] = $validated['city'];
        }
        if (array_key_exists('country', $validated)) {
            $attributes['country'] = $validated['country'];
        }
        if (array_key_exists('address', $validated)) {
            $attributes['address'] = $validated['address'];
        }
        if (array_key_exists('plannedAt', $validated)) {
            $attributes['planned_at'] = Carbon::parse($validated['plannedAt']);
        }
        if (array_key_exists('arrivedAt', $validated)) {
            $attributes['arrived_at'] = $validated['arrivedAt']
                ? Carbon::parse($validated['arrivedAt'])
                : null;
        }
        if (array_key_exists('status', $validated)) {
            $attributes['status'] = $validated['status'];
        }
        if (array_key_exists('note', $validated)) {
            $attributes['note'] = $validated['note'];
        }

        $checkpoint->update($attributes);

        return response()->json([
            'checkpoint' => (new CheckpointResource($checkpoint->fresh()))->resolve(),
        ]);
    }
}
