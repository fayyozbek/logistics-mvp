<?php

namespace App\Services;

use App\Models\FinanceRecord;
use Database\Seeders\Support\FinanceAmountRules;

class FinanceRecordStatusService
{
    public function updateStatus(FinanceRecord $financeRecord, string $status): FinanceRecord
    {
        $synced = FinanceAmountRules::apply([
            'total_amount' => $financeRecord->total_amount,
            'paid_amount' => $financeRecord->paid_amount,
            'status' => $status,
        ]);

        $financeRecord->update([
            'status' => $synced['status'],
            'paid_amount' => $synced['paid_amount'],
        ]);

        return $financeRecord->load('client');
    }
}
