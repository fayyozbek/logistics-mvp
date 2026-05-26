<?php

namespace App\Http\Resources;

use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Shipment */
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
            'weightUnit' => $this->weight_unit ?? ($this->weight ? 'kg' : null),
            'volume' => $this->volume,
            'volumeUnit' => $this->volume_unit ?? ($this->volume ? 'm3' : null),
            'createdAt' => $this->created_at?->format('Y-m-d'),
            'plannedPickup' => $this->planned_pickup?->format('Y-m-d'),
            'estimatedDelivery' => $this->estimated_delivery?->format('Y-m-d'),
            'notes' => $this->notes,
            'priceAmount' => (float) ($this->price_amount ?? 0),
            'currency' => $this->currency ?? 'USD',
            'financeId' => $this->financeRecord ? (string) $this->financeRecord->id : null,
            'telegramNotifications' => (bool) $this->telegram_notifications,
            'checkpoints' => CheckpointResource::collection($this->whenLoaded('checkpoints')),
            'client' => new ClientResource($this->whenLoaded('client')),
            'manager' => new ManagerResource($this->whenLoaded('manager')),
            'financeRecord' => new FinanceRecordResource($this->whenLoaded('financeRecord')),
        ];
    }
}
