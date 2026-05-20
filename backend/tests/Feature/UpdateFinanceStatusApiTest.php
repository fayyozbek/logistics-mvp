<?php

namespace Tests\Feature;

use App\Models\FinanceRecord;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UpdateFinanceStatusApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_can_update_finance_record_status(): void
    {
        $record = FinanceRecord::query()->where('status', 'unpaid')->firstOrFail();

        $this->patchJson("/api/finance/{$record->id}/status", [
            'status' => 'paid',
        ])
            ->assertOk()
            ->assertJsonPath('financeRecord.id', (string) $record->id)
            ->assertJsonPath('financeRecord.status', 'paid');

        $this->assertDatabaseHas('finance_records', [
            'id' => $record->id,
            'status' => 'paid',
        ]);
    }

    public function test_invalid_status_is_rejected(): void
    {
        $record = FinanceRecord::query()->firstOrFail();

        $this->patchJson("/api/finance/{$record->id}/status", [
            'status' => 'cancelled',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->assertDatabaseHas('finance_records', [
            'id' => $record->id,
            'status' => $record->status,
        ]);
    }

    public function test_finance_record_not_found(): void
    {
        $this->patchJson('/api/finance/99999/status', [
            'status' => 'paid',
        ])
            ->assertNotFound();
    }
}
