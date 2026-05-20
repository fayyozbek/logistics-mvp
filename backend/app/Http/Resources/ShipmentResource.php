<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Shipment */
class ShipmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'trackingNumber' => $this->tracking_number,
            'type' => $this->transport_type,
            'status' => $this->status,
            'clientId' => (string) $this->client_id,
            'managerId' => $this->manager_id ? (string) $this->manager_id : null,
            'origin' => $this->origin,
            'destination' => $this->destination,
            'cargo' => $this->cargo,
            'weight' => $this->weight,
            'volume' => $this->volume,
            'createdAt' => $this->created_at?->format('Y-m-d'),
            'estimatedDelivery' => $this->estimated_delivery?->format('Y-m-d'),
            'financeId' => $this->financeRecord ? (string) $this->financeRecord->id : null,
            'telegramNotifications' => (bool) $this->telegram_notifications,
            'checkpoints' => CheckpointResource::collection($this->whenLoaded('checkpoints')),
            'client' => new ClientResource($this->whenLoaded('client')),
            'manager' => new ManagerResource($this->whenLoaded('manager')),
            'financeRecord' => new FinanceRecordResource($this->whenLoaded('financeRecord')),
        ];
    }
}
