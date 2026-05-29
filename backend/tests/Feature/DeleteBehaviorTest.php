<?php

namespace Tests\Feature;

use App\Models\Checkpoint;
use App\Models\Client;
use App\Models\Manager;
use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class DeleteBehaviorTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsAdmin();
    }

    public function test_checkpoint_delete_does_not_remove_shipment(): void
    {
        $checkpoint = Checkpoint::query()->firstOrFail();
        $shipmentId = $checkpoint->shipment_id;

        $this->deleteJson("/api/checkpoints/{$checkpoint->id}")->assertOk();

        $this->assertDatabaseHas('shipments', ['id' => $shipmentId, 'deleted_at' => null]);
    }

    public function test_client_delete_blocked_while_active_shipment_exists(): void
    {
        $client = Client::query()->whereHas('shipments')->firstOrFail();

        $this->deleteJson("/api/clients/{$client->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['client']);
    }

    public function test_client_can_be_deleted_after_shipments_soft_deleted(): void
    {
        $client = Client::factory()->create([
            'company' => 'Orphan Client Co',
            'contact' => 'Test User',
        ]);

        $shipment = Shipment::factory()->create([
            'client_id' => $client->id,
            'manager_id' => Manager::query()->value('id'),
            'tracking_number' => 'LGX-2026-0999',
            'transport_type' => 'auto',
            'status' => 'planned',
            'origin' => 'A',
            'destination' => 'B',
        ]);

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertOk();

        $this->deleteJson("/api/clients/{$client->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Partner/client deleted.');
    }

    public function test_manager_delete_blocked_with_active_shipment(): void
    {
        $manager = Manager::query()
            ->whereHas('shipments', fn ($query) => $query->whereIn('status', Shipment::ACTIVE_STATUSES))
            ->firstOrFail();

        $this->deleteJson("/api/managers/{$manager->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['manager']);
    }

    public function test_finance_record_survives_shipment_soft_delete(): void
    {
        $shipment = Shipment::query()->whereHas('financeRecord')->firstOrFail();
        $financeId = $shipment->financeRecord->id;

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertOk();

        $this->assertSoftDeleted('shipments', ['id' => $shipment->id]);
        $this->assertDatabaseHas('finance_records', [
            'id' => $financeId,
            'shipment_id' => $shipment->id,
        ]);

        $this->getJson('/api/finance')
            ->assertOk()
            ->assertJsonFragment(['id' => (string) $financeId]);
    }
}
