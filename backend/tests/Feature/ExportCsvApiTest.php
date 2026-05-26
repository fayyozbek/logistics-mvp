<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class ExportCsvApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsFinance();
    }

    public function test_shipments_csv_export(): void
    {
        $response = $this->get('/api/export/shipments.csv');

        $response
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $content = $response->getContent();
        $this->assertIsString($content);
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('tracking_number,client,manager', $content);
        $this->assertStringContainsString('LGX-2026-0498', $content);
        $this->assertStringContainsString('weight_unit', $content);
    }

    public function test_finance_csv_export(): void
    {
        $response = $this->get('/api/export/finance.csv');

        $response
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $content = $response->getContent();
        $this->assertIsString($content);
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('invoice_number,shipment_tracking_number,client', $content);
        $this->assertStringContainsString('outstanding_amount', $content);
        $this->assertStringContainsString('INV-2026-', $content);
    }
}
