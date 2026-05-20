<?php

namespace Database\Seeders;

use App\Models\Manager;
use Database\Seeders\Support\DemoData;
use Database\Seeders\Support\DemoSeedState;
use Illuminate\Database\Seeder;

class ManagerSeeder extends Seeder
{
    public function run(): void
    {
        foreach (DemoData::managers() as $key => $attributes) {
            DemoSeedState::$managerIds[$key] = Manager::query()->create($attributes)->id;
        }
    }
}
