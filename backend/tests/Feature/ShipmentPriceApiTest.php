<?php

namespace Tests\Feature;

use App\Models\FinanceRecord;
use App\Models\Shipment;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class ShipmentPriceApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsManager();
    }

    public function test_create_shipment_with_price_syncs_finance_record(): void
    {
        $response = $this->postJson('/api/shipments', [
            'clientId' => 1,
            'type' => 'auto',
            'origin' => 'Алматы',
            'destination' => 'Бишкек',
            'priceAmount' => 12500.50,
            'currency' => 'USD',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('shipment.priceAmount', 12500.5)
            ->assertJsonPath('shipment.currency', 'USD');

        $shipmentId = $response->json('shipment.id');

        $this->assertDatabaseHas('shipments', [
            'id' => $shipmentId,
            'price_amount' => 12500.50,
            'currency' => 'USD',
        ]);

        $this->assertDatabaseHas('finance_records', [
            'shipment_id' => $shipmentId,
            'total_amount' => 12500.50,
            'currency' => 'USD',
            'status' => 'unpaid',
        ]);
    }

    public function test_update_shipment_price_syncs_finance_total(): void
    {
        $shipment = Shipment::query()->where('tracking_number', 'LGX-2026-0498')->firstOrFail();
        $financeId = FinanceRecord::query()->where('shipment_id', $shipment->id)->value('id');
        $this->assertNotNull($financeId);

        $this->patchJson("/api/shipments/{$shipment->id}", [
            'priceAmount' => 9900,
            'currency' => 'KZT',
        ])
            ->assertOk()
            ->assertJsonPath('shipment.priceAmount', 9900)
            ->assertJsonPath('shipment.currency', 'KZT');

        $this->assertDatabaseHas('shipments', [
            'id' => $shipment->id,
            'price_amount' => 9900,
            'currency' => 'KZT',
        ]);

        $this->assertDatabaseHas('finance_records', [
            'id' => $financeId,
            'total_amount' => 9900,
            'currency' => 'KZT',
        ]);
    }

    public function test_create_shipment_rejects_negative_price(): void
    {
        $this->postJson('/api/shipments', [
            'clientId' => 1,
            'type' => 'auto',
            'origin' => 'Алматы',
            'destination' => 'Бишкек',
            'priceAmount' => -100,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['priceAmount']);

        $this->assertSame(6, Shipment::query()->count());
    }

    public function test_create_shipment_rejects_invalid_currency(): void
    {
        $this->postJson('/api/shipments', [
            'clientId' => 1,
            'type' => 'auto',
            'origin' => 'Алматы',
            'destination' => 'Бишкек',
            'priceAmount' => 1000,
            'currency' => 'EUR',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['currency']);
    }

    public function test_shipment_list_includes_price_fields(): void
    {
        $response = $this->getJson('/api/shipments')
            ->assertOk();

        $first = $response->json('shipments.0');
        $this->assertArrayHasKey('priceAmount', $first);
        $this->assertArrayHasKey('currency', $first);
    }
}
