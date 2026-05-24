<?php

namespace Database\Seeders;

use Database\Seeders\Support\DemoSeedState;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        DemoSeedState::reset();

        $this->call([
            ClientSeeder::class,
            ManagerSeeder::class,
            ShipmentSeeder::class,
            FinanceRecordSeeder::class,
            TelegramSettingSeeder::class,
            UserSeeder::class,
            AccountTelegramSeeder::class,
        ]);
    }
}
