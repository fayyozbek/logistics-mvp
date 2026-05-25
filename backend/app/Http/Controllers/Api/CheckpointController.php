<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCheckpointRequest;
use App\Http\Requests\UpdateCheckpointRequest;
use App\Http\Resources\CheckpointResource;
use App\Models\Checkpoint;
use App\Models\Shipment;
use App\Services\CheckpointSequenceService;
use App\Services\TelegramBotService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CheckpointController extends Controller
{
    public function __construct(
        private readonly CheckpointSequenceService $checkpointSequenceService,
        private readonly TelegramBotService $telegram,
    ) {}

    public function store(StoreCheckpointRequest $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validated();
        $insertAfter = $validated['insertAfter'] ?? -1;

        $checkpoint = DB::transaction(
            fn () => $this->checkpointSequenceService->insert($shipment, $validated, $insertAfter),
        );

        if ($this->telegram->shouldNotifyForShipment($shipment, 'checkpoint')) {
            $this->telegram->sendCheckpointAddedNotification($shipment, $checkpoint);
        }

        return response()->json([
            'checkpoint' => (new CheckpointResource($checkpoint))->resolve(),
        ], 201);
    }

    public function update(UpdateCheckpointRequest $request, Checkpoint $checkpoint): JsonResponse
    {
        $checkpoint->update($this->mapCheckpointUpdateAttributes($request->validated()));

        return response()->json([
            'checkpoint' => (new CheckpointResource($checkpoint->fresh()))->resolve(),
        ]);
    }

    public function destroy(Checkpoint $checkpoint): JsonResponse
    {
        $checkpointId = (string) $checkpoint->id;
        $shipment = $checkpoint->shipment;

        DB::transaction(function () use ($checkpoint, $shipment): void {
            $checkpoint->delete();
            $this->checkpointSequenceService->resequenceAfterDelete($shipment);
        });

        return response()->json([
            'message' => 'Checkpoint deleted.',
            'checkpointId' => $checkpointId,
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function mapCheckpointUpdateAttributes(array $validated): array
    {
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

        return $attributes;
    }
}
