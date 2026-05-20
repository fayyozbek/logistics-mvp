<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\FinanceRecord */
class FinanceRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'shipmentId' => (string) $this->shipment_id,
            'clientId' => (string) $this->client_id,
            'totalAmount' => (float) $this->total_amount,
            'paidAmount' => (float) $this->paid_amount,
            'currency' => $this->currency,
            'invoiceDate' => $this->invoice_date?->format('Y-m-d'),
            'dueDate' => $this->due_date?->format('Y-m-d'),
            'status' => $this->status,
            'items' => $this->items ?? [],
            'client' => new ClientResource($this->whenLoaded('client')),
        ];
    }
}
