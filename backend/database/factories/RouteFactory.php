<?php

namespace Database\Factories;

use App\Models\Route;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Route>
 */
class RouteFactory extends Factory
{
    protected $model = Route::class;

    public function definition(): array
    {
        $transport = fake()->randomElement(['auto', 'air', 'sea', 'intermodal']);

        return [
            'name' => null,
            'origin' => fake()->city(),
            'destination' => fake()->city(),
            'transport_type' => $transport,
        ];
    }
}
