<?php

namespace App\Services;

use App\Models\Checkpoint;
use App\Models\Shipment;
use Carbon\Carbon;

class CheckpointSequenceService
{
    /**
     * @param  array<string, mixed>  $validated
     */
    public function insert(Shipment $shipment, array $validated, int $insertAfter = -1): Checkpoint
    {
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
        $this->applySequenceOrder($orderedIds);

        return $checkpoint->fresh();
    }

    public function resequenceAfterDelete(Shipment $shipment): void
    {
        $remaining = $shipment->checkpoints()->orderBy('sequence')->get();
        $this->applySequenceOrder($remaining->pluck('id')->all());
    }

    /**
     * @param  list<int|string>  $orderedIds
     */
    private function applySequenceOrder(array $orderedIds): void
    {
        foreach ($orderedIds as $index => $id) {
            Checkpoint::query()->whereKey($id)->update(['sequence' => $index + 1]);
        }
    }
}
