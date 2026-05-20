<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Manager;
use App\Models\Shipment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Shipment>
 */
class ShipmentFactory extends Factory
{
    protected $model = Shipment::class;

    public function definition(): array
    {
        return [
            'tracking_number' => 'LGX-'.fake()->unique()->numerify('2026-####'),
            'transport_type' => fake()->randomElement(['auto', 'air', 'sea', 'intermodal']),
            'status' => fake()->randomElement(['planned', 'in_transit', 'at_checkpoint', 'delivered', 'delayed']),
            'client_id' => Client::factory(),
            'manager_id' => Manager::factory(),
            'route_id' => null,
            'origin' => fake()->city(),
            'destination' => fake()->city(),
            'cargo' => fake()->words(2, true),
            'weight' => fake()->numberBetween(100, 5000).' кг',
            'volume' => fake()->numberBetween(1, 50).' м³',
            'estimated_delivery' => fake()->dateTimeBetween('now', '+30 days'),
            'telegram_notifications' => fake()->boolean(),
        ];
    }
}
