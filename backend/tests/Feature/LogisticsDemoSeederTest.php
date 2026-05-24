<?php

namespace Tests\Feature;

use App\Models\Checkpoint;
use App\Models\Client;
use App\Models\FinanceRecord;
use App\Models\Manager;
use App\Models\Shipment;
use App\Models\TelegramSetting;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\Support\FinanceAmountRules;
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

        $this->assertDatabaseHas('finance_records', [
            'total_amount' => 22000,
            'paid_amount' => 0,
            'status' => 'unpaid',
        ]);

        foreach (FinanceRecord::all() as $record) {
            $this->assertTrue(
                FinanceAmountRules::isConsistent(
                    (float) $record->total_amount,
                    (float) $record->paid_amount,
                    $record->status,
                ),
            );
        }
    }

    public function test_demo_seeder_is_idempotent_when_run_twice(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(5, Client::count());
        $this->assertSame(4, Manager::count());
        $this->assertSame(6, Shipment::count());
        $this->assertSame(21, Checkpoint::count());
        $this->assertSame(6, FinanceRecord::count());
        $this->assertSame(1, TelegramSetting::count());
    }

    public function test_db_seed_after_database_seeder_does_not_duplicate_clients(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->artisan('db:seed', ['--force' => true])->assertExitCode(0);

        $this->assertSame(5, Client::count());
        $this->assertSame(4, Manager::count());
        $this->assertSame(6, Shipment::count());
    }
}
