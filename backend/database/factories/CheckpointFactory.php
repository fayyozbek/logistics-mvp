<?php

namespace Database\Factories;

use App\Models\Checkpoint;
use App\Models\Shipment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Checkpoint>
 */
class CheckpointFactory extends Factory
{
    protected $model = Checkpoint::class;

    public function definition(): array
    {
        return [
            'shipment_id' => Shipment::factory(),
            'sequence' => 0,
            'city' => fake()->city(),
            'country' => fake()->countryCode(),
            'address' => fake()->streetAddress(),
            'planned_at' => fake()->dateTimeBetween('-3 days', '+7 days'),
            'arrived_at' => null,
            'status' => 'upcoming',
            'note' => null,
        ];
    }
}
