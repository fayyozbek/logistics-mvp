<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Manager */
class ManagerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'role' => $this->role,
            'department' => $this->department,
            'avatar' => $this->avatar,
            'email' => $this->email,
            'phone' => $this->phone,
            'telegramId' => $this->telegram_id,
            'region' => $this->region,
            'activeShipments' => (int) ($this->active_shipments_count ?? $this->shipments_count ?? 0),
        ];
    }
}
