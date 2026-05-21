<?php

namespace Database\Seeders;

use App\Models\Checkpoint;
use App\Models\Shipment;
use Carbon\Carbon;
use Database\Seeders\Support\DemoData;
use Database\Seeders\Support\DemoSeedState;
use Illuminate\Database\Seeder;

class ShipmentSeeder extends Seeder
{
    public function run(): void
    {
        foreach (DemoData::shipments() as $row) {
            $shipment = Shipment::query()->updateOrCreate(
                ['tracking_number' => $row['tracking_number']],
                [
                    'transport_type' => $row['transport_type'],
                    'status' => $row['status'],
                    'client_id' => DemoSeedState::$clientIds[$row['client_key']],
                    'manager_id' => DemoSeedState::$managerIds[$row['manager_key']],
                    'origin' => $row['origin'],
                    'destination' => $row['destination'],
                    'cargo' => $row['cargo'],
                    'weight' => $row['weight'],
                    'volume' => $row['volume'],
                    'estimated_delivery' => $row['estimated_delivery'],
                    'telegram_notifications' => $row['telegram_notifications'],
                ],
            );

            if ($shipment->wasRecentlyCreated) {
                $shipment->forceFill([
                    'created_at' => Carbon::parse($row['created_at']),
                    'updated_at' => Carbon::parse($row['created_at']),
                ])->save();
            }

            DemoSeedState::$shipmentIds[$row['key']] = $shipment->id;

            foreach ($row['checkpoints'] as $index => $checkpoint) {
                Checkpoint::query()->updateOrCreate(
                    [
                        'shipment_id' => $shipment->id,
                        'sequence' => $index + 1,
                    ],
                    [
                        'city' => $checkpoint['city'],
                        'country' => $checkpoint['country'],
                        'address' => $checkpoint['address'],
                        'planned_at' => Carbon::parse($checkpoint['planned_at']),
                        'arrived_at' => isset($checkpoint['arrived_at']) && $checkpoint['arrived_at']
                            ? Carbon::parse($checkpoint['arrived_at'])
                            : null,
                        'status' => $checkpoint['status'],
                        'note' => $checkpoint['note'] ?? null,
                    ],
                );
            }
        }
    }
}
