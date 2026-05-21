<?php

namespace Database\Seeders\Support;

final class FinanceAmountRules
{
    /**
     * MVP finance consistency:
     * - paid: paid_amount = total, balance = 0
     * - unpaid/overdue: paid_amount = 0, balance = total
     * - partial: 0 < paid_amount < total, balance > 0
     *
     * @param  array{total_amount: float|int|string, paid_amount?: float|int|string, status: string}  $attributes
     * @return array{total_amount: float|int|string, paid_amount: float, status: string}
     */
    public static function apply(array $attributes): array
    {
        $total = (float) $attributes['total_amount'];
        $status = $attributes['status'];

        $attributes['paid_amount'] = match ($status) {
            'paid' => $total,
            'unpaid', 'overdue' => 0.0,
            'partial' => self::normalizePartialPaid($total, (float) ($attributes['paid_amount'] ?? 0)),
            default => (float) ($attributes['paid_amount'] ?? 0),
        };

        return $attributes;
    }

    public static function balance(float $total, float $paid): float
    {
        return max(0, round($total - $paid, 2));
    }

    public static function isConsistent(float $total, float $paid, string $status): bool
    {
        return match ($status) {
            'paid' => abs($paid - $total) < 0.01,
            'unpaid', 'overdue' => abs($paid) < 0.01 && $total > 0,
            'partial' => $paid > 0 && $paid < $total,
            default => false,
        };
    }

    private static function normalizePartialPaid(float $total, float $currentPaid): float
    {
        if ($total <= 0) {
            return 0.0;
        }

        if ($currentPaid > 0 && $currentPaid < $total) {
            return round($currentPaid, 2);
        }

        return round($total / 2, 2);
    }
}
