<?php

namespace Tests\Feature;

use App\Models\Checkpoint;
use App\Models\Client;
use App\Models\FinanceRecord;
use App\Models\Manager;
use App\Models\Route;
use App\Models\Shipment;
use App\Models\TelegramSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LogisticsModelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_logistics_migrations_run(): void
    {
        $this->assertTrue(
            Schema::hasTable('clients')
            && Schema::hasTable('managers')
            && Schema::hasTable('routes')
            && Schema::hasTable('shipments')
            && Schema::hasTable('checkpoints')
            && Schema::hasTable('finance_records')
            && Schema::hasTable('telegram_settings')
        );
    }

    public function test_shipment_relationships(): void
    {
        $client = Client::factory()->create();
        $manager = Manager::factory()->create();
        $route = Route::factory()->create([
            'origin' => 'Алматы',
            'destination' => 'Ташкент',
            'transport_type' => 'auto',
        ]);

        $shipment = Shipment::factory()
            ->for($client)
            ->for($manager)
            ->for($route)
            ->create([
                'tracking_number' => 'LGX-2026-TEST',
                'status' => 'in_transit',
            ]);

        Checkpoint::factory()->for($shipment)->create([
            'sequence' => 1,
            'city' => 'Алматы',
            'status' => 'passed',
        ]);

        FinanceRecord::factory()->for($shipment)->for($client)->create([
            'status' => 'partial',
            'total_amount' => 4800,
            'paid_amount' => 2000,
        ]);

        $shipment->refresh()->load(['client', 'manager', 'route', 'checkpoints', 'financeRecord']);

        $this->assertTrue($shipment->client->is($client));
        $this->assertTrue($shipment->manager->is($manager));
        $this->assertTrue($shipment->route->is($route));
        $this->assertCount(1, $shipment->checkpoints);
        $this->assertSame('partial', $shipment->financeRecord->status);
        $this->assertCount(1, $client->shipments);
        $this->assertCount(1, $manager->shipments);
    }

    public function test_telegram_setting_casts(): void
    {
        $setting = TelegramSetting::create([
            'chat_id' => '-100123',
            'connected' => true,
            'event_flags' => ['departure' => true, 'delay' => true],
        ]);

        $this->assertTrue($setting->connected);
        $this->assertTrue($setting->event_flags['delay']);
    }
}
