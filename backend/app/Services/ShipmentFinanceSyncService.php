<?php

namespace App\Services;

use App\Models\FinanceRecord;
use App\Models\Shipment;
use App\Support\ShipmentCurrencies;
use Database\Seeders\Support\FinanceAmountRules;

class ShipmentFinanceSyncService
{
    /**
     * Keeps finance total_amount and currency aligned with shipment service price (MVP source of truth on write).
     */
    public function syncFromShipment(Shipment $shipment): ?FinanceRecord
    {
        $total = (float) ($shipment->price_amount ?? 0);
        $currency = $shipment->currency ?? ShipmentCurrencies::DEFAULT;

        $existing = $shipment->relationLoaded('financeRecord')
            ? $shipment->financeRecord
            : $shipment->financeRecord()->first();

        if ($existing) {
            $synced = FinanceAmountRules::apply([
                'total_amount' => $total,
                'paid_amount' => $existing->paid_amount,
                'status' => $existing->status,
            ]);

            $existing->update([
                'client_id' => $shipment->client_id,
                'total_amount' => $synced['total_amount'],
                'paid_amount' => $synced['paid_amount'],
                'currency' => $currency,
                'status' => $synced['status'],
            ]);

            return $existing->fresh();
        }

        return FinanceRecord::query()->create([
            'shipment_id' => $shipment->id,
            'client_id' => $shipment->client_id,
            'total_amount' => $total,
            'paid_amount' => 0,
            'currency' => $currency,
            'status' => 'unpaid',
            'items' => [
                ['label' => 'Стоимость перевозки', 'amount' => $total],
            ],
        ]);
    }
}
