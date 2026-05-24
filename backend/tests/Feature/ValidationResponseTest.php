<?php

namespace Tests\Feature;

use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ValidationResponseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_validation_failure_returns_consistent_422_json(): void
    {
        $response = $this->postJson('/api/shipments', []);

        $response
            ->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors'])
            ->assertJsonPath('message', 'Проверьте введённые данные.');

        $message = (string) $response->json('errors.clientId.0');
        $this->assertMatchesRegularExpression('/[А-Яа-яЁё]/u', $message);
    }

    public function test_missing_shipment_returns_consistent_404_json(): void
    {
        $this->getJson('/api/shipments/99999')
            ->assertNotFound()
            ->assertJsonPath('message', 'Запись не найдена.');
    }

    public function test_soft_deleted_shipment_returns_404_json(): void
    {
        $shipment = Shipment::query()->firstOrFail();
        $shipment->delete();

        $this->getJson("/api/shipments/{$shipment->id}")
            ->assertNotFound()
            ->assertJsonPath('message', 'Запись не найдена.');
    }

    public function test_finance_status_validation_failure(): void
    {
        $this->patchJson('/api/finance/1/status', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status'])
            ->assertJsonPath('message', 'Проверьте введённые данные.');
    }
}
