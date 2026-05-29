<?php

namespace Tests\Feature;

use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class ShipmentUnitsValidationTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsManager();
    }

    public function test_create_shipment_accepts_weight_and_volume_units(): void
    {
        $this->postJson('/api/shipments', [
            'clientId' => 1,
            'type' => 'auto',
            'origin' => 'Almaty',
            'destination' => 'Tashkent',
            'weight' => '2400',
            'weightUnit' => 'kg',
            'volume' => '18.5',
            'volumeUnit' => 'm3',
        ])
            ->assertCreated()
            ->assertJsonPath('shipment.weight', '2400')
            ->assertJsonPath('shipment.weightUnit', 'kg')
            ->assertJsonPath('shipment.volume', '18.5')
            ->assertJsonPath('shipment.volumeUnit', 'm3');

        $this->assertDatabaseHas('shipments', [
            'origin' => 'Almaty',
            'destination' => 'Tashkent',
            'weight' => '2400',
            'weight_unit' => 'kg',
            'volume' => '18.5',
            'volume_unit' => 'm3',
        ]);
    }

    public function test_create_defaults_units_when_omitted(): void
    {
        $this->postJson('/api/shipments', [
            'clientId' => 1,
            'type' => 'auto',
            'origin' => 'Seoul',
            'destination' => 'Tokyo',
            'weight' => '500',
            'volume' => '12',
        ])
            ->assertCreated()
            ->assertJsonPath('shipment.weightUnit', 'kg')
            ->assertJsonPath('shipment.volumeUnit', 'm3');
    }

    public function test_create_rejects_invalid_weight_and_units(): void
    {
        $this->postJson('/api/shipments', [
            'clientId' => 1,
            'type' => 'auto',
            'origin' => 'Almaty',
            'destination' => 'Tashkent',
            'weight' => '-10',
            'weightUnit' => 'lb',
            'volume' => 'abc',
            'volumeUnit' => 'liters',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['weight', 'weightUnit', 'volume', 'volumeUnit']);
    }

    public function test_update_rejects_invalid_units(): void
    {
        $shipment = Shipment::query()->firstOrFail();

        $this->patchJson("/api/shipments/{$shipment->id}", [
            'weight' => '0',
            'weightUnit' => 'ton',
            'volume' => '1 200',
            'volumeUnit' => 'cbm',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['weight', 'volume']);
    }

    public function test_update_accepts_valid_units(): void
    {
        $shipment = Shipment::query()->firstOrFail();

        $this->patchJson("/api/shipments/{$shipment->id}", [
            'weight' => '1500000',
            'weightUnit' => 'ton',
            'volume' => '42',
            'volumeUnit' => 'cbm',
        ])
            ->assertOk()
            ->assertJsonPath('shipment.weight', '1500000')
            ->assertJsonPath('shipment.weightUnit', 'ton')
            ->assertJsonPath('shipment.volume', '42')
            ->assertJsonPath('shipment.volumeUnit', 'cbm');
    }
}
