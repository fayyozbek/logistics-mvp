<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Checkpoint */
class CheckpointResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'city' => $this->city,
            'country' => $this->country,
            'address' => $this->address,
            'plannedAt' => $this->planned_at?->format('Y-m-d H:i'),
            'arrivedAt' => $this->arrived_at?->format('Y-m-d H:i'),
            'status' => $this->status,
            'note' => $this->note,
        ];
    }
}
