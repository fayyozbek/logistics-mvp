<?php

namespace Database\Factories;

use App\Models\Manager;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Manager>
 */
class ManagerFactory extends Factory
{
    protected $model = Manager::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'avatar' => strtoupper(fake()->lexify('??')),
            'email' => fake()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'telegram_id' => '@'.fake()->userName(),
            'region' => fake()->randomElement(['Центральная Азия', 'Европа', 'СНГ', 'Восток']),
        ];
    }
}
