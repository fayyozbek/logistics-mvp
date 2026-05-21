<?php

namespace Tests\Feature;

use App\Models\Shipment;
use App\Models\TrackingNumberCounter;
use App\Services\TrackingNumberGenerator;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrackingNumberGeneratorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_creates_unique_tracking_number(): void
    {
        Carbon::setTestNow('2026-05-21 12:00:00');

        $first = $this->postJson('/api/shipments', $this->validShipmentPayload())->assertCreated();
        $second = $this->postJson('/api/shipments', $this->validShipmentPayload())->assertCreated();

        $firstNumber = $first->json('shipment.trackingNumber');
        $secondNumber = $second->json('shipment.trackingNumber');

        $this->assertNotSame($firstNumber, $secondNumber);
        $this->assertSame('LGX-2026-0562', $firstNumber);
        $this->assertSame('LGX-2026-0563', $secondNumber);
        $this->assertSame(8, Shipment::query()->count());
    }

    public function test_does_not_reuse_tracking_number_after_shipment_deletion(): void
    {
        Carbon::setTestNow('2026-05-21 12:00:00');

        $created = $this->postJson('/api/shipments', $this->validShipmentPayload())->assertCreated();
        $issuedNumber = $created->json('shipment.trackingNumber');
        $this->assertSame('LGX-2026-0562', $issuedNumber);

        $shipmentId = $created->json('shipment.id');
        Shipment::query()->whereKey($shipmentId)->delete();

        $this->assertDatabaseMissing('shipments', ['tracking_number' => $issuedNumber]);

        $next = $this->postJson('/api/shipments', $this->validShipmentPayload())->assertCreated();
        $nextNumber = $next->json('shipment.trackingNumber');

        $this->assertSame('LGX-2026-0563', $nextNumber);
        $this->assertNotSame($issuedNumber, $nextNumber);
        $this->assertDatabaseHas('tracking_number_counters', [
            'year' => 2026,
            'last_sequence' => 563,
        ]);
    }

    public function test_handles_current_year_prefix(): void
    {
        Carbon::setTestNow('2027-03-15 09:00:00');

        TrackingNumberCounter::query()->create([
            'year' => 2027,
            'last_sequence' => 12,
        ]);

        $generator = app(TrackingNumberGenerator::class);
        $trackingNumber = $generator->next(2027);

        $this->assertSame('LGX-2027-0013', $trackingNumber);
        $this->assertMatchesRegularExpression('/^LGX-2027-\d{4}$/', $trackingNumber);
    }

    /**
     * @return array<string, mixed>
     */
    private function validShipmentPayload(): array
    {
        return [
            'clientId' => 1,
            'managerId' => 1,
            'type' => 'auto',
            'origin' => 'Алматы',
            'destination' => 'Ташкент',
            'cargo' => 'Тестовый груз',
        ];
    }
}
