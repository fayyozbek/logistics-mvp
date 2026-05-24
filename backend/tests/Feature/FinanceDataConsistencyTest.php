<?php

namespace Tests\Feature;

use App\Models\FinanceRecord;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\Support\FinanceAmountRules;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class FinanceDataConsistencyTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsFinance();
    }

    public function test_seeded_finance_records_match_amount_rules(): void
    {
        foreach (FinanceRecord::all() as $record) {
            $this->assertTrue(
                FinanceAmountRules::isConsistent(
                    (float) $record->total_amount,
                    (float) $record->paid_amount,
                    $record->status,
                ),
                "Finance record {$record->id} ({$record->status}) has inconsistent amounts.",
            );
        }
    }

    public function test_updating_status_to_paid_sets_paid_amount_to_total(): void
    {
        $record = FinanceRecord::query()->where('status', 'unpaid')->firstOrFail();
        $total = (float) $record->total_amount;

        $response = $this->patchJson("/api/finance/{$record->id}/status", ['status' => 'paid'])
            ->assertOk()
            ->assertJsonPath('financeRecord.status', 'paid');

        $this->assertEquals($total, (float) $response->json('financeRecord.paidAmount'));
        $this->assertEquals($total, (float) $response->json('financeRecord.totalAmount'));

        $record->refresh();
        $this->assertSame($total, (float) $record->paid_amount);
        $this->assertSame(0.0, FinanceAmountRules::balance($total, (float) $record->paid_amount));
    }

    public function test_updating_status_to_unpaid_clears_paid_amount(): void
    {
        $record = FinanceRecord::query()->where('status', 'paid')->firstOrFail();
        $total = (float) $record->total_amount;

        $response = $this->patchJson("/api/finance/{$record->id}/status", ['status' => 'unpaid'])
            ->assertOk()
            ->assertJsonPath('financeRecord.status', 'unpaid');

        $this->assertEquals(0.0, (float) $response->json('financeRecord.paidAmount'));

        $record->refresh();
        $this->assertSame(0.0, (float) $record->paid_amount);
        $this->assertSame($total, FinanceAmountRules::balance($total, 0.0));
    }

    public function test_updating_status_to_partial_keeps_in_range_paid_amount(): void
    {
        $record = FinanceRecord::query()->where('status', 'partial')->firstOrFail();
        $total = (float) $record->total_amount;
        $paid = (float) $record->paid_amount;

        $this->patchJson("/api/finance/{$record->id}/status", ['status' => 'partial'])
            ->assertOk()
            ->assertJsonPath('financeRecord.status', 'partial');

        $record->refresh();
        $this->assertGreaterThan(0, (float) $record->paid_amount);
        $this->assertLessThan($total, (float) $record->paid_amount);
        $this->assertSame($paid, (float) $record->paid_amount);
    }

    public function test_updating_status_to_partial_from_unpaid_uses_default_split(): void
    {
        $record = FinanceRecord::query()->where('status', 'unpaid')->firstOrFail();
        $total = (float) $record->total_amount;

        $this->patchJson("/api/finance/{$record->id}/status", ['status' => 'partial'])
            ->assertOk()
            ->assertJsonPath('financeRecord.status', 'partial');

        $record->refresh();
        $this->assertGreaterThan(0, (float) $record->paid_amount);
        $this->assertLessThan($total, (float) $record->paid_amount);
        $this->assertSame(round($total / 2, 2), (float) $record->paid_amount);
    }
}
