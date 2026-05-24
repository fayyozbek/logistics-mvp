<?php

namespace Tests\Feature;

use App\Models\FinanceRecord;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceReportApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_finance_report_endpoint_returns_summary(): void
    {
        $totalAmount = (float) FinanceRecord::query()->sum('total_amount');
        $paidAmount = (float) FinanceRecord::query()->sum('paid_amount');
        $overdueAmount = (float) FinanceRecord::query()
            ->where('status', 'overdue')
            ->get()
            ->sum(fn (FinanceRecord $record) => max(0, (float) $record->total_amount - (float) $record->paid_amount));

        $response = $this->getJson('/api/finance/report')
            ->assertOk()
            ->assertJsonStructure([
                'report' => [
                    'totalAmount',
                    'paidAmount',
                    'outstandingAmount',
                    'overdueAmount',
                    'countByStatus' => ['paid', 'partial', 'unpaid', 'overdue'],
                    'revenueByMonth' => [
                        '*' => ['month', 'revenue', 'paid', 'invoiceCount'],
                    ],
                ],
            ]);

        $report = $response->json('report');
        $this->assertEqualsWithDelta($totalAmount, (float) $report['totalAmount'], 0.01);
        $this->assertEqualsWithDelta($paidAmount, (float) $report['paidAmount'], 0.01);
        $this->assertEqualsWithDelta($totalAmount - $paidAmount, (float) $report['outstandingAmount'], 0.01);
        $this->assertEqualsWithDelta($overdueAmount, (float) $report['overdueAmount'], 0.01);
        $this->assertSame(
            FinanceRecord::query()->where('status', 'paid')->count(),
            $report['countByStatus']['paid'],
        );
        $this->assertSame(
            FinanceRecord::query()->where('status', 'overdue')->count(),
            $report['countByStatus']['overdue'],
        );

        $months = collect($report['revenueByMonth'])
            ->pluck('month')
            ->all();

        $this->assertNotEmpty($months);
        $this->assertContains('2026-04', $months);
    }

    public function test_finance_index_response_unchanged(): void
    {
        $this->getJson('/api/finance')
            ->assertOk()
            ->assertJsonStructure([
                'financeRecords',
                'clients',
            ])
            ->assertJsonMissingPath('report');
    }
}
