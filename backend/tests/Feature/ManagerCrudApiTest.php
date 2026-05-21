<?php

namespace Tests\Feature;

use App\Models\Manager;
use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManagerCrudApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_can_list_managers(): void
    {
        $this->getJson('/api/managers')
            ->assertOk()
            ->assertJsonStructure([
                'managers' => [
                    '*' => ['id', 'name', 'avatar', 'email', 'phone', 'telegramId', 'region', 'activeShipments'],
                ],
            ])
            ->assertJsonFragment(['name' => 'Дина Сейткали']);
    }

    public function test_managers_overview_endpoint_keeps_legacy_bundle(): void
    {
        $this->getJson('/api/managers/overview')
            ->assertOk()
            ->assertJsonStructure([
                'managers',
                'clients',
                'shipments',
            ]);
    }

    public function test_can_create_manager(): void
    {
        $response = $this->postJson('/api/managers', [
            'name' => 'Тест Менеджеров',
            'email' => 'test.manager@logistix.kz',
            'phone' => '+7 701 111 2233',
            'telegramId' => '@test_manager',
            'region' => 'Казахстан',
            'role' => 'Senior Manager',
            'department' => 'Operations',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('manager.name', 'Тест Менеджеров')
            ->assertJsonPath('manager.role', 'Senior Manager')
            ->assertJsonPath('manager.department', 'Operations')
            ->assertJsonPath('manager.avatar', 'ТМ');

        $this->assertDatabaseHas('managers', [
            'name' => 'Тест Менеджеров',
            'email' => 'test.manager@logistix.kz',
            'role' => 'Senior Manager',
            'department' => 'Operations',
        ]);

        $this->assertSame(5, Manager::query()->count());
    }

    public function test_can_show_and_update_manager(): void
    {
        $manager = Manager::query()->create([
            'name' => 'Unused Manager',
            'avatar' => 'UM',
            'email' => 'unused@logistix.kz',
        ]);

        $this->getJson("/api/managers/{$manager->id}")
            ->assertOk()
            ->assertJsonPath('manager.name', 'Unused Manager');

        $this->patchJson("/api/managers/{$manager->id}", [
            'name' => 'Updated Manager',
            'phone' => '+7 707 000 0000',
            'role' => 'Lead',
            'department' => 'Finance Ops',
        ])
            ->assertOk()
            ->assertJsonPath('manager.name', 'Updated Manager')
            ->assertJsonPath('manager.department', 'Finance Ops');

        $this->assertDatabaseHas('managers', [
            'id' => $manager->id,
            'name' => 'Updated Manager',
            'department' => 'Finance Ops',
        ]);
    }

    public function test_can_delete_unused_manager(): void
    {
        $manager = Manager::query()->create([
            'name' => 'Disposable Manager',
            'avatar' => 'DM',
            'email' => 'dispose@logistix.kz',
        ]);

        $this->deleteJson("/api/managers/{$manager->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Manager deleted.')
            ->assertJsonPath('managerId', (string) $manager->id);

        $this->assertDatabaseMissing('managers', ['id' => $manager->id]);
    }

    public function test_cannot_delete_manager_with_active_shipments(): void
    {
        $manager = Manager::query()->where('name', 'Дина Сейткали')->firstOrFail();

        $this->assertTrue(
            Shipment::query()
                ->where('manager_id', $manager->id)
                ->whereIn('status', ['planned', 'in_transit', 'at_checkpoint', 'delayed'])
                ->exists(),
        );

        $this->deleteJson("/api/managers/{$manager->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['manager']);

        $this->assertDatabaseHas('managers', ['id' => $manager->id]);
    }

    public function test_can_delete_manager_with_only_delivered_shipments(): void
    {
        $manager = Manager::query()->create([
            'name' => 'Delivered Only Manager',
            'avatar' => 'DO',
        ]);

        Shipment::query()
            ->where('tracking_number', 'LGX-2026-0421')
            ->update(['manager_id' => $manager->id, 'status' => 'delivered']);

        $this->deleteJson("/api/managers/{$manager->id}")
            ->assertOk();

        $this->assertDatabaseMissing('managers', ['id' => $manager->id]);
    }

    public function test_create_manager_validation_failure(): void
    {
        $this->postJson('/api/managers', [
            'email' => 'not-an-email',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->assertSame(4, Manager::query()->count());
    }
}
