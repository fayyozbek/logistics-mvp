<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\FinanceRecord;
use App\Models\Shipment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceRecord>
 */
class FinanceRecordFactory extends Factory
{
    protected $model = FinanceRecord::class;

    public function definition(): array
    {
        $total = fake()->randomFloat(2, 1000, 25000);

        return [
            'shipment_id' => Shipment::factory(),
            'client_id' => Client::factory(),
            'total_amount' => $total,
            'paid_amount' => 0,
            'currency' => 'USD',
            'invoice_date' => fake()->dateTimeBetween('-30 days', 'now'),
            'due_date' => fake()->dateTimeBetween('now', '+30 days'),
            'status' => 'unpaid',
            'items' => [
                ['label' => 'Фрахт', 'amount' => round($total * 0.7, 2)],
                ['label' => 'Таможня', 'amount' => round($total * 0.2, 2)],
                ['label' => 'Страховка', 'amount' => round($total * 0.1, 2)],
            ],
        ];
    }
}
