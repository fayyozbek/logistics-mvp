<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Manager;
use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class ManagerClientCrudApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_admin_can_create_update_and_delete_unassigned_manager(): void
    {
        $this->actingAsAdmin();

        $create = $this->postJson('/api/managers', [
            'name' => 'Новый Менеджер',
            'email' => 'new.manager@logistix.kz',
            'phone' => '+7 701 000 0000',
            'telegramId' => '@new_manager',
            'region' => 'СНГ',
        ])
            ->assertCreated()
            ->assertJsonPath('manager.name', 'Новый Менеджер')
            ->assertJsonPath('manager.email', 'new.manager@logistix.kz')
            ->assertJsonPath('manager.telegramId', '@new_manager');

        $managerId = $create->json('manager.id');
        $this->assertIsString($managerId);
        $this->assertArrayNotHasKey('password', $create->json('manager'));

        $this->patchJson("/api/managers/{$managerId}", [
            'name' => 'Обновлённый Менеджер',
            'region' => 'Европа',
        ])
            ->assertOk()
            ->assertJsonPath('manager.name', 'Обновлённый Менеджер')
            ->assertJsonPath('manager.region', 'Европа');

        $this->deleteJson("/api/managers/{$managerId}")
            ->assertOk()
            ->assertJsonPath('message', 'Manager deleted.');

        $this->assertDatabaseMissing('managers', ['id' => $managerId]);
    }

    public function test_manager_and_operator_cannot_mutate_managers(): void
    {
        $target = Manager::factory()->create();

        foreach (['actingAsManager', 'actingAsOperator'] as $method) {
            $this->{$method}();

            $this->postJson('/api/managers', ['name' => 'Blocked Create'])->assertForbidden();
            $this->patchJson("/api/managers/{$target->id}", ['name' => 'Blocked Update'])->assertForbidden();
            $this->deleteJson("/api/managers/{$target->id}")->assertForbidden();
        }
    }

    public function test_assigned_manager_delete_returns_422(): void
    {
        $this->actingAsAdmin();

        $manager = Manager::query()->whereHas('shipments')->firstOrFail();

        $this->deleteJson("/api/managers/{$manager->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['manager']);

        $this->assertDatabaseHas('managers', ['id' => $manager->id]);
    }

    public function test_manager_can_be_deleted_when_only_linked_to_archived_shipments(): void
    {
        $this->actingAsAdmin();

        $manager = Manager::factory()->create();
        $shipment = Shipment::query()->firstOrFail();
        $shipment->update(['manager_id' => $manager->id]);
        $shipment->delete();

        $this->deleteJson("/api/managers/{$manager->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Manager deleted.');
    }

    public function test_managers_index_preserves_combined_response_shape(): void
    {
        $this->actingAsManager();

        $this->getJson('/api/managers/overview')
            ->assertOk()
            ->assertJsonStructure([
                'managers' => [
                    '*' => ['id', 'name', 'email', 'activeShipments'],
                ],
                'clients' => [
                    '*' => ['id', 'company'],
                ],
                'shipments',
            ]);
    }

    public function test_finance_and_viewer_cannot_get_managers_but_can_get_clients(): void
    {
        $this->actingAsFinance();
        $this->getJson('/api/managers')->assertForbidden();
        $this->getJson('/api/clients')
            ->assertOk()
            ->assertJsonStructure(['clients' => [['id', 'company', 'contact', 'email']]]);

        $this->actingAsViewer();
        $this->getJson('/api/managers')->assertForbidden();
        $this->getJson('/api/clients')->assertOk();
    }

    public function test_admin_manager_operator_can_create_and_update_client(): void
    {
        foreach (['actingAsAdmin', 'actingAsManager', 'actingAsOperator'] as $method) {
            $this->{$method}();

            $create = $this->postJson('/api/clients', [
                'company' => "Company {$method}",
                'contactName' => 'Контактное лицо',
                'email' => strtolower(str_replace('actingAs', '', $method)).'@client.test',
                'phone' => '+7 700 111 1111',
                'country' => 'Казахстан',
            ])
                ->assertCreated()
                ->assertJsonPath('client.company', "Company {$method}");

            $clientId = $create->json('client.id');

            $this->patchJson("/api/clients/{$clientId}", [
                'company' => "Updated {$method}",
            ])
                ->assertOk()
                ->assertJsonPath('client.company', "Updated {$method}");
        }
    }

    public function test_finance_and_viewer_cannot_create_or_update_clients(): void
    {
        $client = Client::factory()->create();

        foreach (['actingAsFinance', 'actingAsViewer'] as $method) {
            $this->{$method}();

            $this->postJson('/api/clients', [
                'company' => 'Blocked Co',
            ])->assertForbidden();

            $this->patchJson("/api/clients/{$client->id}", [
                'company' => 'Blocked Update',
            ])->assertForbidden();
        }
    }

    public function test_admin_can_delete_unassigned_client(): void
    {
        $this->actingAsAdmin();

        $client = Client::factory()->create();

        $this->deleteJson("/api/clients/{$client->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Partner/client deleted.');

        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
    }

    public function test_manager_and_operator_cannot_delete_clients(): void
    {
        $client = Client::factory()->create();

        foreach (['actingAsManager', 'actingAsOperator'] as $method) {
            $this->{$method}();
            $this->deleteJson("/api/clients/{$client->id}")->assertForbidden();
        }
    }

    public function test_used_client_delete_returns_422(): void
    {
        $this->actingAsAdmin();

        $client = Client::query()->whereHas('shipments')->firstOrFail();

        $this->deleteJson("/api/clients/{$client->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['client']);

        $this->assertDatabaseHas('clients', ['id' => $client->id]);
    }

    public function test_manager_create_requires_name(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/managers', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    }

    public function test_client_create_requires_company(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['company']);
    }

    public function test_missing_manager_or_client_returns_404(): void
    {
        $this->actingAsAdmin();

        $this->patchJson('/api/managers/999999', ['name' => 'Missing'])->assertNotFound();
        $this->deleteJson('/api/managers/999999')->assertNotFound();
        $this->patchJson('/api/clients/999999', ['company' => 'Missing'])->assertNotFound();
        $this->deleteJson('/api/clients/999999')->assertNotFound();
    }
}
