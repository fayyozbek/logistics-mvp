<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class ClientCrudApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsAdmin();
    }

    public function test_can_list_clients(): void
    {
        $this->getJson('/api/clients')
            ->assertOk()
            ->assertJsonStructure([
                'clients' => [
                    '*' => ['id', 'company', 'contact', 'email', 'phone', 'country'],
                ],
            ])
            ->assertJsonFragment(['company' => 'KazExport LLP']);
    }

    public function test_can_create_client(): void
    {
        $response = $this->postJson('/api/clients', [
            'company' => 'Test Partner LLP',
            'name' => 'Айгуль Тестова',
            'email' => 'partner@example.com',
            'phone' => '+7 701 000 0001',
            'country' => 'Казахстан',
            'city' => 'Алматы',
            'address' => 'ул. Абая 10',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('client.company', 'Test Partner LLP')
            ->assertJsonPath('client.contact', 'Айгуль Тестова')
            ->assertJsonPath('client.city', 'Алматы')
            ->assertJsonPath('client.address', 'ул. Абая 10');

        $this->assertDatabaseHas('clients', [
            'company' => 'Test Partner LLP',
            'contact' => 'Айгуль Тестова',
            'email' => 'partner@example.com',
            'city' => 'Алматы',
        ]);

        $this->assertSame(6, Client::query()->count());
    }

    public function test_can_show_and_update_client(): void
    {
        $client = Client::query()->create([
            'company' => 'Unused Partner',
            'contact' => 'Old Contact',
            'email' => 'old@example.com',
            'phone' => null,
            'country' => 'KZ',
            'city' => 'Астана',
            'address' => 'Old address',
        ]);

        $this->getJson("/api/clients/{$client->id}")
            ->assertOk()
            ->assertJsonPath('client.company', 'Unused Partner');

        $this->patchJson("/api/clients/{$client->id}", [
            'company' => 'Updated Partner GmbH',
            'contact' => 'New Contact',
            'email' => 'new@example.com',
            'city' => 'Берлин',
            'address' => 'Neue Str. 1',
        ])
            ->assertOk()
            ->assertJsonPath('client.company', 'Updated Partner GmbH')
            ->assertJsonPath('client.contact', 'New Contact')
            ->assertJsonPath('client.city', 'Берлин');

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'company' => 'Updated Partner GmbH',
            'contact' => 'New Contact',
            'city' => 'Берлин',
        ]);
    }

    public function test_can_delete_unused_client(): void
    {
        $client = Client::query()->create([
            'company' => 'Disposable Partner',
            'contact' => 'No Shipments',
            'email' => 'dispose@example.com',
        ]);

        $this->deleteJson("/api/clients/{$client->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Partner/client deleted.')
            ->assertJsonPath('clientId', (string) $client->id);

        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
    }

    public function test_cannot_delete_client_used_by_shipments(): void
    {
        $client = Client::query()->where('company', 'KazExport LLP')->firstOrFail();
        $this->assertTrue(Shipment::query()->where('client_id', $client->id)->exists());

        $this->deleteJson("/api/clients/{$client->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['client']);

        $this->assertDatabaseHas('clients', ['id' => $client->id]);
    }

    public function test_create_client_validation_failure(): void
    {
        $this->postJson('/api/clients', [
            'email' => 'not-an-email',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['company', 'contact']);

        $this->assertSame(5, Client::query()->count());
    }
}
