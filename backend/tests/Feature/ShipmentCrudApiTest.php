<?php

namespace Tests\Feature;

use App\Models\Checkpoint;
use App\Models\FinanceRecord;
use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class ShipmentCrudApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsManager();
    }

    public function test_can_update_shipment(): void
    {
        $shipment = Shipment::query()->where('tracking_number', 'LGX-2026-0498')->firstOrFail();

        $this->patchJson("/api/shipments/{$shipment->id}", [
            'clientId' => 2,
            'managerId' => 2,
            'type' => 'air',
            'origin' => 'Астана',
            'destination' => 'Бишкек',
            'cargoName' => 'Медоборудование (обновлено)',
            'weight' => '900',
            'weightUnit' => 'kg',
            'volume' => '12',
            'volumeUnit' => 'm3',
            'plannedPickup' => '2026-05-01',
            'plannedDelivery' => '2026-06-20',
            'notes' => 'Срочная доставка',
        ])
            ->assertOk()
            ->assertJsonPath('shipment.trackingNumber', 'LGX-2026-0498')
            ->assertJsonPath('shipment.clientId', '2')
            ->assertJsonPath('shipment.managerId', '2')
            ->assertJsonPath('shipment.type', 'air')
            ->assertJsonPath('shipment.origin', 'Астана')
            ->assertJsonPath('shipment.destination', 'Бишкек')
            ->assertJsonPath('shipment.cargo', 'Медоборудование (обновлено)')
            ->assertJsonPath('shipment.weight', '900')
            ->assertJsonPath('shipment.weightUnit', 'kg')
            ->assertJsonPath('shipment.volume', '12')
            ->assertJsonPath('shipment.volumeUnit', 'm3')
            ->assertJsonPath('shipment.plannedPickup', '2026-05-01')
            ->assertJsonPath('shipment.estimatedDelivery', '2026-06-20')
            ->assertJsonPath('shipment.notes', 'Срочная доставка');

        $this->assertDatabaseHas('shipments', [
            'id' => $shipment->id,
            'client_id' => 2,
            'manager_id' => 2,
            'transport_type' => 'air',
            'origin' => 'Астана',
            'destination' => 'Бишкек',
            'cargo' => 'Медоборудование (обновлено)',
            'weight_unit' => 'kg',
            'volume_unit' => 'm3',
            'notes' => 'Срочная доставка',
        ]);
    }

    public function test_can_delete_shipment(): void
    {
        $shipment = Shipment::query()->where('tracking_number', 'LGX-2026-0561')->firstOrFail();
        $shipmentId = $shipment->id;
        $checkpointCount = Checkpoint::query()->where('shipment_id', $shipmentId)->count();
        $financeId = FinanceRecord::query()->where('shipment_id', $shipmentId)->value('id');

        $this->assertGreaterThan(0, $checkpointCount);
        $this->assertNotNull($financeId);

        $this->deleteJson("/api/shipments/{$shipmentId}")
            ->assertOk()
            ->assertJsonPath('message', 'Shipment archived.')
            ->assertJsonPath('shipmentId', (string) $shipmentId);

        $this->assertSoftDeleted('shipments', ['id' => $shipmentId]);
        $this->assertDatabaseHas('checkpoints', ['shipment_id' => $shipmentId]);
        $this->assertSame($checkpointCount, Checkpoint::query()->where('shipment_id', $shipmentId)->count());
        $this->assertDatabaseHas('finance_records', ['id' => $financeId, 'shipment_id' => $shipmentId]);
    }

    public function test_soft_deleted_shipment_is_not_accessible_via_api(): void
    {
        $shipment = Shipment::query()->where('tracking_number', 'LGX-2026-0421')->firstOrFail();

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertOk();

        $this->getJson("/api/shipments/{$shipment->id}")
            ->assertNotFound();

        $this->patchJson("/api/shipments/{$shipment->id}", ['cargo' => 'Blocked'])
            ->assertNotFound();
    }

    public function test_delete_missing_shipment_returns_404_json(): void
    {
        $this->deleteJson('/api/shipments/99999')
            ->assertNotFound()
            ->assertJsonStructure(['message']);
    }

    public function test_list_does_not_show_deleted_shipment(): void
    {
        $shipment = Shipment::query()->where('tracking_number', 'LGX-2026-0387')->firstOrFail();

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertOk();

        $this->getJson('/api/shipments')
            ->assertOk()
            ->assertJsonMissing(['trackingNumber' => 'LGX-2026-0387']);

        $trackingNumbers = collect($this->getJson('/api/shipments')->json('shipments'))
            ->pluck('trackingNumber')
            ->all();

        $this->assertNotContains('LGX-2026-0387', $trackingNumbers);
        $this->assertSame(5, Shipment::query()->count());
        $this->assertSame(6, Shipment::withTrashed()->count());
    }
}
