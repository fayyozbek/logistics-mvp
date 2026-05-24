<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class LogisticsApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsViewer();
    }

    public function test_dashboard_endpoint(): void
    {
        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'summary' => [
                    'monthlyTurnover',
                    'totalPaid',
                    'activeShipments',
                    'completedShipments',
                    'receivable',
                ],
                'monthlyStats',
                'transportShare',
                'managers',
                'charts',
            ]);
    }

    public function test_shipments_index_endpoint(): void
    {
        $this->getJson('/api/shipments')
            ->assertOk()
            ->assertJsonStructure([
                'shipments' => [
                    '*' => [
                        'id',
                        'trackingNumber',
                        'type',
                        'status',
                        'clientId',
                        'client' => ['id', 'company'],
                        'manager',
                        'checkpoints',
                    ],
                ],
            ])
            ->assertJsonFragment(['trackingNumber' => 'LGX-2026-0498']);
    }

    public function test_shipments_show_endpoint(): void
    {
        $response = $this->getJson('/api/shipments/2');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'shipment' => [
                    'trackingNumber',
                    'checkpoints',
                    'client',
                    'manager',
                ],
            ]);
    }

    public function test_tracking_endpoint(): void
    {
        $this->getJson('/api/tracking')
            ->assertOk()
            ->assertJsonStructure([
                'shipments' => [
                    '*' => [
                        'trackingNumber',
                        'client' => ['id', 'company'],
                        'manager',
                        'checkpoints',
                    ],
                ],
            ]);
    }

    public function test_tracking_endpoint_includes_client_and_manager_names(): void
    {
        $response = $this->getJson('/api/tracking')->assertOk();
        $first = $response->json('shipments.0');

        $this->assertIsArray($first);
        $this->assertArrayHasKey('company', $first['client']);
        $this->assertNotEmpty($first['client']['company']);
    }

    public function test_managers_endpoint(): void
    {
        $this->actingAsOperator();

        $this->getJson('/api/managers')
            ->assertOk()
            ->assertJsonStructure([
                'managers',
                'clients',
                'shipments',
            ]);
    }

    public function test_finance_endpoint(): void
    {
        $this->getJson('/api/finance')
            ->assertOk()
            ->assertJsonStructure([
                'financeRecords' => [
                    '*' => [
                        'id',
                        'shipmentId',
                        'clientId',
                        'totalAmount',
                        'status',
                        'items',
                    ],
                ],
                'clients',
            ]);
    }

    public function test_telegram_settings_endpoint(): void
    {
        $this->actingAsFinance();
        $this->seed(\Database\Seeders\AccountTelegramSeeder::class);

        $this->getJson('/api/telegram/settings')
            ->assertOk()
            ->assertJsonStructure([
                'settings' => [
                    'id',
                    'telegramChatId',
                    'enabled',
                    'notificationsEnabled',
                    'notifyShipmentCreated',
                ],
                'shipments',
            ]);
    }
}
