<?php

namespace Tests\Feature;

use App\Models\Checkpoint;
use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class CheckpointApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsOperator();
    }

    public function test_can_add_checkpoint(): void
    {
        $shipment = Shipment::query()->with('checkpoints')->firstOrFail();
        $initialCount = $shipment->checkpoints->count();

        $response = $this->postJson("/api/shipments/{$shipment->id}/checkpoints", [
            'city' => 'Астана',
            'country' => 'KZ',
            'address' => 'Терминал Астана-1',
            'plannedAt' => '2026-06-20 10:00',
            'status' => 'upcoming',
            'note' => 'Новая точка',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('checkpoint.city', 'Астана')
            ->assertJsonPath('checkpoint.country', 'KZ')
            ->assertJsonPath('checkpoint.status', 'upcoming');

        $this->assertSame($initialCount + 1, $shipment->checkpoints()->count());
        $this->assertDatabaseHas('checkpoints', [
            'shipment_id' => $shipment->id,
            'city' => 'Астана',
            'address' => 'Терминал Астана-1',
        ]);
    }

    public function test_can_update_checkpoint(): void
    {
        $checkpoint = Checkpoint::query()->firstOrFail();

        $this->patchJson("/api/checkpoints/{$checkpoint->id}", [
            'city' => 'Обновлённый город',
            'status' => 'current',
            'note' => 'Обновлено через API',
        ])
            ->assertOk()
            ->assertJsonPath('checkpoint.id', (string) $checkpoint->id)
            ->assertJsonPath('checkpoint.city', 'Обновлённый город')
            ->assertJsonPath('checkpoint.status', 'current');

        $this->assertDatabaseHas('checkpoints', [
            'id' => $checkpoint->id,
            'city' => 'Обновлённый город',
            'status' => 'current',
            'note' => 'Обновлено через API',
        ]);
    }

    public function test_add_checkpoint_validation_failure(): void
    {
        $shipment = Shipment::query()->firstOrFail();
        $countBefore = $shipment->checkpoints()->count();

        $this->postJson("/api/shipments/{$shipment->id}/checkpoints", [
            'country' => 'KZ',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['city', 'address', 'plannedAt']);

        $this->assertSame($countBefore, $shipment->checkpoints()->count());
    }

    public function test_update_checkpoint_validation_failure(): void
    {
        $checkpoint = Checkpoint::query()->firstOrFail();

        $this->patchJson("/api/checkpoints/{$checkpoint->id}", [
            'status' => 'invalid-status',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
    }

    public function test_shipment_not_found_when_adding_checkpoint(): void
    {
        $this->postJson('/api/shipments/99999/checkpoints', [
            'city' => 'Алматы',
            'address' => 'Склад',
            'plannedAt' => '2026-06-20 10:00',
        ])
            ->assertNotFound();
    }

    public function test_checkpoint_not_found_when_updating(): void
    {
        $this->patchJson('/api/checkpoints/99999', [
            'city' => 'Алматы',
        ])
            ->assertNotFound();
    }

    public function test_can_delete_checkpoint(): void
    {
        $checkpoint = Checkpoint::query()->firstOrFail();
        $shipment = $checkpoint->shipment;
        $initialCount = $shipment->checkpoints()->count();

        $this->deleteJson("/api/checkpoints/{$checkpoint->id}")
            ->assertOk()
            ->assertJsonPath('checkpointId', (string) $checkpoint->id)
            ->assertJsonPath('message', 'Checkpoint deleted.');

        $this->assertDatabaseMissing('checkpoints', ['id' => $checkpoint->id]);
        $this->assertSame($initialCount - 1, $shipment->checkpoints()->count());
        $this->assertDatabaseHas('shipments', ['id' => $shipment->id]);
    }

    public function test_deleting_checkpoint_resequences_remaining(): void
    {
        $shipment = Shipment::query()->with('checkpoints')->firstOrFail();
        $checkpoints = $shipment->checkpoints()->orderBy('sequence')->get();
        $this->assertGreaterThanOrEqual(2, $checkpoints->count());

        $middle = $checkpoints->get(1);
        $this->deleteJson("/api/checkpoints/{$middle->id}")->assertOk();

        $remaining = $shipment->checkpoints()->orderBy('sequence')->pluck('sequence')->all();
        $this->assertSame(range(1, count($remaining)), $remaining);
    }

    public function test_checkpoint_not_found_when_deleting(): void
    {
        $this->deleteJson('/api/checkpoints/99999')
            ->assertNotFound();
    }
}
