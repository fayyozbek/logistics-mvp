<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_dashboard_returns_ok_with_expected_shape(): void
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
                'monthlyStats' => [
                    '*' => ['month', 'shipments', 'revenue'],
                ],
                'transportShare' => [
                    '*' => ['name', 'value', 'color'],
                ],
                'managers' => [
                    '*' => ['name', 'activeShipments'],
                ],
                'charts' => [
                    'moneyByMonth',
                    'directionShare',
                ],
            ]);
    }

    public function test_dashboard_monthly_stats_use_yyyy_mm_periods(): void
    {
        $response = $this->getJson('/api/dashboard')->assertOk();
        $monthlyStats = $response->json('monthlyStats');

        $this->assertIsArray($monthlyStats);
        $this->assertNotEmpty($monthlyStats);

        foreach ($monthlyStats as $row) {
            $this->assertMatchesRegularExpression('/^\d{4}-\d{2}$/', $row['month']);
            $this->assertGreaterThan(0, $row['shipments']);
            $this->assertGreaterThan(0, $row['revenue']);
        }
    }

    public function test_dashboard_summary_reflects_seeded_finance_totals(): void
    {
        $response = $this->getJson('/api/dashboard')->assertOk();
        $summary = $response->json('summary');

        $this->assertGreaterThan(0, $summary['monthlyTurnover']);
        $this->assertGreaterThanOrEqual(0, $summary['totalPaid']);
        $this->assertGreaterThanOrEqual(0, $summary['activeShipments']);
        $this->assertGreaterThanOrEqual(0, $summary['completedShipments']);
        $this->assertSame(
            $summary['monthlyTurnover'] - $summary['totalPaid'],
            $summary['receivable'],
        );
    }
}
