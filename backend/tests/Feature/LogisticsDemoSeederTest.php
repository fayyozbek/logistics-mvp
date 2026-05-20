<?php

namespace Tests\Feature;

use App\Models\Checkpoint;
use App\Models\Client;
use App\Models\FinanceRecord;
use App\Models\Manager;
use App\Models\Shipment;
use App\Models\TelegramSetting;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LogisticsDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeder_populates_expected_counts(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(5, Client::count());
        $this->assertSame(4, Manager::count());
        $this->assertSame(6, Shipment::count());
        $this->assertSame(21, Checkpoint::count());
        $this->assertSame(6, FinanceRecord::count());
        $this->assertSame(1, TelegramSetting::count());

        $this->assertDatabaseHas('shipments', [
            'tracking_number' => 'LGX-2026-0498',
            'status' => 'in_transit',
        ]);
    }
}
