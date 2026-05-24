<?php

namespace Tests\Feature;

use App\Models\FinanceRecord;
use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class RoleAccessApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_unauthenticated_requests_return_401_json(): void
    {
        $this->getJson('/api/dashboard')
            ->assertUnauthorized()
            ->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_viewer_can_read_dashboard_and_shipments(): void
    {
        $this->actingAsViewer();

        $this->getJson('/api/dashboard')->assertOk();
        $this->getJson('/api/shipments')->assertOk();
        $this->getJson('/api/tracking')->assertOk();
        $this->getJson('/api/finance')->assertOk();
    }

    public function test_viewer_cannot_access_managers_or_telegram(): void
    {
        $this->actingAsViewer();

        $this->getJson('/api/managers')
            ->assertForbidden()
            ->assertJson(['message' => 'This action is unauthorized.']);

        $this->getJson('/api/telegram/settings')
            ->assertForbidden()
            ->assertJson(['message' => 'This action is unauthorized.']);
    }

    public function test_viewer_cannot_create_or_mutate_shipments(): void
    {
        $this->actingAsViewer();
        $shipment = Shipment::query()->firstOrFail();

        $this->postJson('/api/shipments', [
            'clientId' => 1,
            'type' => 'auto',
            'origin' => 'Алматы',
            'destination' => 'Ташкент',
        ])->assertForbidden();

        $this->patchJson("/api/shipments/{$shipment->id}/status", ['status' => 'in_transit'])
            ->assertForbidden();

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertForbidden();
    }

    public function test_operator_can_update_status_and_checkpoints_but_not_create_shipment(): void
    {
        $this->actingAsOperator();
        $shipment = Shipment::query()->where('status', 'planned')->firstOrFail();

        $this->patchJson("/api/shipments/{$shipment->id}/status", ['status' => 'in_transit'])
            ->assertOk();

        $this->postJson("/api/shipments/{$shipment->id}/checkpoints", [
            'city' => 'Шымкент',
            'address' => 'Терминал',
            'plannedAt' => '2026-07-01 10:00',
        ])->assertCreated();

        $this->postJson('/api/shipments', [
            'clientId' => 1,
            'type' => 'auto',
            'origin' => 'Алматы',
            'destination' => 'Ташкент',
        ])->assertForbidden();

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertForbidden();
    }

    public function test_manager_can_create_and_delete_shipments(): void
    {
        $this->actingAsManager();
        $shipment = Shipment::query()->firstOrFail();

        $this->postJson('/api/shipments', [
            'clientId' => 1,
            'type' => 'auto',
            'origin' => 'Алматы',
            'destination' => 'Астана',
        ])->assertCreated();

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertOk();
    }

    public function test_manager_cannot_update_finance_status_or_telegram_settings(): void
    {
        $this->actingAsManager();
        $record = FinanceRecord::query()->firstOrFail();

        $this->patchJson("/api/finance/{$record->id}/status", ['status' => 'paid'])
            ->assertForbidden()
            ->assertJson(['message' => 'This action is unauthorized.']);

        $this->patchJson('/api/telegram/settings', ['telegramChatId' => '-100'])
            ->assertForbidden();
    }

    public function test_finance_can_read_shipments_but_not_managers(): void
    {
        $this->actingAsFinance();

        $response = $this->getJson('/api/shipments')
            ->assertOk();

        $shipments = $response->json('shipments');
        $this->assertNotEmpty($shipments);
        $this->assertArrayHasKey('client', $shipments[0]);
        $this->assertArrayHasKey('company', $shipments[0]['client']);

        $this->getJson('/api/managers')
            ->assertForbidden()
            ->assertJson(['message' => 'This action is unauthorized.']);
    }

    public function test_viewer_shipments_include_client_and_manager_display_fields(): void
    {
        $this->actingAsViewer();

        $response = $this->getJson('/api/shipments')
            ->assertOk();

        $shipments = $response->json('shipments');
        $this->assertNotEmpty($shipments);
        $this->assertArrayHasKey('client', $shipments[0]);
        $this->assertArrayHasKey('company', $shipments[0]['client']);
        $this->assertArrayHasKey('manager', $shipments[0]);
    }

    public function test_finance_can_update_finance_status_but_not_shipments(): void
    {
        $this->actingAsFinance();
        $record = FinanceRecord::query()->where('status', 'unpaid')->firstOrFail();
        $shipment = Shipment::query()->firstOrFail();

        $this->patchJson("/api/finance/{$record->id}/status", ['status' => 'paid'])
            ->assertOk();

        $this->getJson('/api/telegram/status')->assertOk();

        $this->getJson('/api/managers')->assertForbidden();

        $this->postJson('/api/shipments', [
            'clientId' => 1,
            'type' => 'auto',
            'origin' => 'Алматы',
            'destination' => 'Ташкент',
        ])->assertForbidden();

        $this->deleteJson("/api/shipments/{$shipment->id}")->assertForbidden();
    }

    public function test_finance_cannot_read_telegram_notification_journal(): void
    {
        $this->actingAsFinance();

        $this->getJson('/api/telegram/notifications')
            ->assertForbidden()
            ->assertJson(['message' => 'This action is unauthorized.']);
    }

    public function test_admin_can_access_all_current_endpoints(): void
    {
        $this->actingAsAdmin();
        $shipment = Shipment::query()->firstOrFail();
        $record = FinanceRecord::query()->firstOrFail();

        $this->getJson('/api/managers')->assertOk();
        $this->getJson('/api/telegram/notifications')->assertOk();
        $this->patchJson('/api/telegram/settings', ['enabled' => true])->assertOk();
        $this->patchJson("/api/finance/{$record->id}/status", ['status' => 'partial'])->assertOk();
        $this->patchJson("/api/shipments/{$shipment->id}/status", ['status' => 'in_transit'])->assertOk();
    }
}
