<?php

namespace Database\Seeders;

use App\Services\TrackingNumberGenerator;
use Illuminate\Database\Seeder;

class TrackingNumberCounterSeeder extends Seeder
{
    public function run(): void
    {
        app(TrackingNumberGenerator::class)->syncFromShipments();
    }
}
