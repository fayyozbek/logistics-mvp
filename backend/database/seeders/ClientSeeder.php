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
            $client = Client::query()->updateOrCreate(
                ['company' => $attributes['company']],
                $attributes,
            );

            DemoSeedState::$clientIds[$key] = $client->id;
        }
    }
}
