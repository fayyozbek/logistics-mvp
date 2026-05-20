<?php

namespace Tests\Feature;

use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreateShipmentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_can_create_shipment(): void
    {
        $response = $this->postJson('/api/shipments', [
            'clientId' => 1,
            'managerId' => 1,
            'type' => 'auto',
            'origin' => 'Алматы',
            'destination' => 'Ташкент',
            'cargo' => 'Электроника',
            'weight' => '1 200 кг',
            'volume' => '8 м³',
            'estimatedDelivery' => '2026-06-15',
            'telegramNotifications' => true,
            'checkpoints' => [
                [
                    'city' => 'Алматы',
                    'country' => 'KZ',
                    'address' => 'Склад Алматы',
                    'plannedAt' => '2026-06-10 08:00',
                    'status' => 'upcoming',
                ],
                [
                    'city' => 'Ташкент',
                    'country' => 'UZ',
                    'address' => 'Склад получателя',
                    'plannedAt' => '2026-06-15 09:00',
                    'status' => 'upcoming',
                ],
            ],
        ]);

        $response
            ->assertCreated()
            ->assertJsonStructure([
                'shipment' => [
                    'id',
                    'trackingNumber',
                    'type',
                    'status',
                    'clientId',
                    'origin',
                    'destination',
                    'checkpoints',
                ],
            ])
            ->assertJsonPath('shipment.type', 'auto')
            ->assertJsonPath('shipment.status', 'planned')
            ->assertJsonPath('shipment.origin', 'Алматы')
            ->assertJsonPath('shipment.destination', 'Ташкент')
            ->assertJsonCount(2, 'shipment.checkpoints');

        $trackingNumber = $response->json('shipment.trackingNumber');
        $this->assertIsString($trackingNumber);
        $this->assertStringStartsWith('LGX-', $trackingNumber);

        $this->assertDatabaseHas('shipments', [
            'tracking_number' => $trackingNumber,
            'transport_type' => 'auto',
            'status' => 'planned',
            'client_id' => 1,
            'origin' => 'Алматы',
            'destination' => 'Ташкент',
        ]);
    }

    public function test_create_shipment_validation_failure(): void
    {
        $this->postJson('/api/shipments', [
            'type' => 'invalid-type',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['clientId', 'type', 'origin', 'destination']);

        $this->assertSame(6, Shipment::query()->count());
    }
}
