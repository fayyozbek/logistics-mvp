<?php

namespace Tests\Feature;

use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class UpdateShipmentStatusApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsOperator();
    }

    public function test_can_update_shipment_status(): void
    {
        $shipment = Shipment::query()->where('status', 'planned')->firstOrFail();

        $this->patchJson("/api/shipments/{$shipment->id}/status", [
            'status' => 'in_transit',
            'note' => 'Отправлен со склада',
        ])
            ->assertOk()
            ->assertJsonPath('shipment.id', (string) $shipment->id)
            ->assertJsonPath('shipment.status', 'in_transit');

        $this->assertDatabaseHas('shipments', [
            'id' => $shipment->id,
            'status' => 'in_transit',
        ]);
    }

    public function test_invalid_status_is_rejected(): void
    {
        $shipment = Shipment::query()->firstOrFail();

        $this->patchJson("/api/shipments/{$shipment->id}/status", [
            'status' => 'cancelled',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->assertDatabaseHas('shipments', [
            'id' => $shipment->id,
            'status' => $shipment->status,
        ]);
    }

    public function test_shipment_not_found(): void
    {
        $this->patchJson('/api/shipments/99999/status', [
            'status' => 'delivered',
        ])
            ->assertNotFound();
    }
}
