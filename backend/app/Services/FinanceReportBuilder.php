<?php

namespace App\Services;

use App\Models\FinanceRecord;
use Database\Seeders\Support\FinanceAmountRules;
use Illuminate\Support\Facades\DB;

class FinanceReportBuilder
{
    private const STATUSES = ['paid', 'partial', 'unpaid', 'overdue'];

    /**
     * @return array{
     *     totalAmount: float,
     *     paidAmount: float,
     *     outstandingAmount: float,
     *     overdueAmount: float,
     *     countByStatus: array<string, int>,
     *     revenueByMonth: list<array{month: string, revenue: float, paid: float, invoiceCount: int}>
     * }
     */
    public function build(): array
    {
        $totalAmount = (float) FinanceRecord::query()->sum('total_amount');
        $paidAmount = (float) FinanceRecord::query()->sum('paid_amount');
        $outstandingAmount = FinanceAmountRules::balance($totalAmount, $paidAmount);

        $overdueAmount = (float) FinanceRecord::query()
            ->where('status', 'overdue')
            ->get()
            ->sum(fn (FinanceRecord $record) => FinanceAmountRules::balance(
                (float) $record->total_amount,
                (float) $record->paid_amount,
            ));

        $rawCounts = FinanceRecord::query()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $countByStatus = [];
        foreach (self::STATUSES as $status) {
            $countByStatus[$status] = (int) ($rawCounts[$status] ?? 0);
        }

        $invoicePeriodSql = $this->invoicePeriodSql();

        $revenueByMonth = FinanceRecord::query()
            ->selectRaw("{$invoicePeriodSql} as period")
            ->selectRaw('sum(total_amount) as revenue')
            ->selectRaw('sum(paid_amount) as paid')
            ->selectRaw('count(*) as invoice_count')
            ->whereNotNull('invoice_date')
            ->groupBy(DB::raw($invoicePeriodSql))
            ->orderBy(DB::raw($invoicePeriodSql))
            ->get()
            ->map(fn ($row) => [
                'month' => $row->period,
                'revenue' => (float) $row->revenue,
                'paid' => (float) $row->paid,
                'invoiceCount' => (int) $row->invoice_count,
            ])
            ->values()
            ->all();

        return [
            'totalAmount' => round($totalAmount, 2),
            'paidAmount' => round($paidAmount, 2),
            'outstandingAmount' => round($outstandingAmount, 2),
            'overdueAmount' => round($overdueAmount, 2),
            'countByStatus' => $countByStatus,
            'revenueByMonth' => $revenueByMonth,
        ];
    }

    private function invoicePeriodSql(): string
    {
        return match (DB::connection()->getDriverName()) {
            'pgsql' => "to_char(invoice_date, 'YYYY-MM')",
            'sqlite' => "strftime('%Y-%m', invoice_date)",
            default => "strftime('%Y-%m', invoice_date)",
        };
    }
}
