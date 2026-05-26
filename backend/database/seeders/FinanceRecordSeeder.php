<?php

namespace Database\Seeders;

use App\Models\FinanceRecord;
use App\Models\Shipment;
use Database\Seeders\Support\DemoData;
use Database\Seeders\Support\DemoSeedState;
use Database\Seeders\Support\FinanceAmountRules;
use Illuminate\Database\Seeder;

class FinanceRecordSeeder extends Seeder
{
    public function run(): void
    {
        foreach (DemoData::financeRecords() as $attributes) {
            $payload = FinanceAmountRules::apply([
                'shipment_id' => DemoSeedState::$shipmentIds[$attributes['shipment_key']],
                'client_id' => DemoSeedState::$clientIds[$attributes['client_key']],
                'total_amount' => $attributes['total_amount'],
                'paid_amount' => $attributes['paid_amount'],
                'currency' => $attributes['currency'],
                'invoice_date' => $attributes['invoice_date'],
                'due_date' => $attributes['due_date'],
                'status' => $attributes['status'],
                'items' => $attributes['items'],
            ]);

            FinanceRecord::query()->updateOrCreate(
                ['shipment_id' => $payload['shipment_id']],
                $payload,
            );

            Shipment::query()
                ->where('id', $payload['shipment_id'])
                ->update([
                    'price_amount' => $payload['total_amount'],
                    'currency' => $payload['currency'],
                ]);
        }
    }
}
