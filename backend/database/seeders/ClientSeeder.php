<?php

namespace Database\Seeders;

use App\Models\Client;
use Database\Seeders\Support\DemoData;
use Database\Seeders\Support\DemoSeedState;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    public function run(): void
    {
        foreach (DemoData::clients() as $key => $attributes) {
            DemoSeedState::$clientIds[$key] = Client::query()->create($attributes)->id;
        }
    }
}
