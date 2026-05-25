<?php

namespace Tests\Feature;

use App\Models\FinanceRecord;
use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class DeleteShipmentApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsAdmin();
    }

    public function test_can_archive_shipment_via_delete(): void
    {
        $shipment = Shipment::query()->firstOrFail();

        $this->deleteJson("/api/shipments/{$shipment->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Shipment archived.');

        $this->assertSoftDeleted('shipments', ['id' => $shipment->id]);
    }

    public function test_archived_shipment_not_in_index(): void
    {
        $shipment = Shipment::query()->firstOrFail();
        $trackingNumber = $shipment->tracking_number;

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertOk();

        $this->getJson('/api/shipments')
            ->assertOk()
            ->assertJsonMissing(['trackingNumber' => $trackingNumber]);
    }

    public function test_archived_shipment_show_returns_404(): void
    {
        $shipment = Shipment::query()->firstOrFail();

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertOk();

        $this->getJson("/api/shipments/{$shipment->id}")->assertNotFound();
    }

    public function test_archived_shipment_keeps_checkpoints_and_finance_records(): void
    {
        $shipment = Shipment::query()->with(['checkpoints', 'financeRecord'])->firstOrFail();
        $checkpointIds = $shipment->checkpoints->pluck('id')->all();
        $financeId = $shipment->financeRecord?->id;

        $this->assertNotEmpty($checkpointIds);
        $this->assertNotNull($financeId);

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertOk();

        foreach ($checkpointIds as $checkpointId) {
            $this->assertDatabaseHas('checkpoints', ['id' => $checkpointId, 'shipment_id' => $shipment->id]);
        }

        $this->assertDatabaseHas('finance_records', ['id' => $financeId, 'shipment_id' => $shipment->id]);
    }

    public function test_archived_shipment_finance_hidden_from_finance_index(): void
    {
        $shipment = Shipment::query()->with('financeRecord')->firstOrFail();
        $financeId = (string) $shipment->financeRecord->id;

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertOk();

        $response = $this->getJson('/api/finance')->assertOk();
        $ids = collect($response->json('financeRecords'))->pluck('id')->all();

        $this->assertNotContains($financeId, $ids);
    }

    public function test_archived_shipment_not_in_tracking_index(): void
    {
        $shipment = Shipment::query()->firstOrFail();
        $trackingNumber = $shipment->tracking_number;

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertOk();

        $this->getJson('/api/tracking')
            ->assertOk()
            ->assertJsonMissing(['trackingNumber' => $trackingNumber]);
    }

    public function test_delete_nonexistent_shipment_returns_404(): void
    {
        $this->deleteJson('/api/shipments/99999')->assertNotFound();
    }
}
