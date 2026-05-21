<?php

namespace App\Services;

use App\Models\FinanceRecord;
use App\Models\Manager;
use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardMetricsBuilder
{
    private const MONTH_LABELS = [
        '01' => 'Янв',
        '02' => 'Фев',
        '03' => 'Мар',
        '04' => 'Апр',
        '05' => 'Май',
        '06' => 'Июн',
        '07' => 'Июл',
        '08' => 'Авг',
        '09' => 'Сен',
        '10' => 'Окт',
        '11' => 'Ноя',
        '12' => 'Дек',
    ];

    private const WEEKDAY_LABELS = [
        'Mon' => 'Пн',
        'Tue' => 'Вт',
        'Wed' => 'Ср',
        'Thu' => 'Чт',
        'Fri' => 'Пт',
        'Sat' => 'Сб',
        'Sun' => 'Вс',
    ];

    /**
     * @return array{
     *     summary: array<string, float|int>,
     *     monthlyStats: list<array{month: string, shipments: int, revenue: float}>,
     *     transportShare: list<array{name: string, value: int, color: string}>,
     *     managers: list<array{name: string, activeShipments: int}>,
     *     charts: array{moneyByMonth: list<array<string, int|float|string>>, directionShare: list<array{name: string, value: int, color: string}>}
     * }
     */
    public function build(?string $dateFrom, ?string $dateTo, string $chartPeriod = 'month'): array
    {
        $financeQuery = $this->financeQuery($dateFrom, $dateTo);
        $shipmentQuery = $this->shipmentQuery($dateFrom, $dateTo);

        $totalRevenue = (float) (clone $financeQuery)->sum('total_amount');
        $totalPaid = (float) (clone $financeQuery)->sum('paid_amount');
        $receivable = $totalRevenue - $totalPaid;

        $activeShipments = (clone $shipmentQuery)
            ->whereIn('status', Shipment::ACTIVE_STATUSES)
            ->count();

        $completedShipments = (clone $shipmentQuery)
            ->where('status', 'delivered')
            ->count();

        $transportShare = (clone $shipmentQuery)
            ->select('transport_type', DB::raw('count(*) as total'))
            ->groupBy('transport_type')
            ->get()
            ->map(fn ($row) => [
                'name' => match ($row->transport_type) {
                    'auto' => 'Авто',
                    'air' => 'Авиа',
                    'sea' => 'Морской',
                    'intermodal' => 'Интермодал',
                    default => $row->transport_type,
                },
                'value' => (int) $row->total,
                'color' => match ($row->transport_type) {
                    'auto' => '#3B82F6',
                    'air' => '#8B5CF6',
                    'sea' => '#06B6D4',
                    'intermodal' => '#10B981',
                    default => '#94A3B8',
                },
            ])
            ->values()
            ->all();

        $invoicePeriodSql = $this->invoicePeriodSql($chartPeriod);

        $monthlyStats = (clone $financeQuery)
            ->whereNotNull('invoice_date')
            ->selectRaw("{$invoicePeriodSql} as period")
            ->selectRaw('count(*) as shipments')
            ->selectRaw('sum(total_amount) as revenue')
            ->groupBy(DB::raw($invoicePeriodSql))
            ->orderBy(DB::raw($invoicePeriodSql))
            ->get()
            ->map(fn ($row) => [
                'month' => $row->period,
                'shipments' => (int) $row->shipments,
                'revenue' => (float) $row->revenue,
            ])
            ->values()
            ->all();

        $chartRows = (clone $financeQuery)
            ->whereNotNull('invoice_date')
            ->selectRaw("{$invoicePeriodSql} as period")
            ->selectRaw('sum(total_amount) as turnover')
            ->selectRaw('sum(paid_amount) as paid')
            ->selectRaw('count(*) as shipments')
            ->groupBy(DB::raw($invoicePeriodSql))
            ->orderBy(DB::raw($invoicePeriodSql))
            ->get();

        $moneyByMonth = $chartRows->map(function ($row) use ($chartPeriod, $shipmentQuery) {
            $periodStart = $this->periodStart($row->period, $chartPeriod);
            $periodEnd = $this->periodEnd($row->period, $chartPeriod);

            $shipmentsInPeriod = (clone $shipmentQuery)
                ->when($periodStart, fn (Builder $query) => $query->whereDate('created_at', '>=', $periodStart))
                ->when($periodEnd, fn (Builder $query) => $query->whereDate('created_at', '<=', $periodEnd))
                ->count();

            $activeInPeriod = (clone $shipmentQuery)
                ->whereIn('status', Shipment::ACTIVE_STATUSES)
                ->when($periodStart, fn (Builder $query) => $query->whereDate('created_at', '>=', $periodStart))
                ->when($periodEnd, fn (Builder $query) => $query->whereDate('created_at', '<=', $periodEnd))
                ->count();

            return [
                'month' => $this->formatPeriodLabel($row->period, $chartPeriod),
                'turnover' => (float) $row->turnover,
                'paid' => (float) $row->paid,
                'shipments' => $shipmentsInPeriod > 0 ? $shipmentsInPeriod : (int) $row->shipments,
                'active' => $activeInPeriod,
            ];
        })->values()->all();

        $directionShare = $this->buildDirectionShare(
            (clone $shipmentQuery)->get(['origin', 'destination']),
        );

        $managers = Manager::query()
            ->withCount([
                'shipments as active_shipments_count' => function (Builder $query) use ($dateFrom, $dateTo) {
                    $query->whereIn('status', Shipment::ACTIVE_STATUSES);
                    if ($dateFrom) {
                        $query->whereDate('created_at', '>=', $dateFrom);
                    }
                    if ($dateTo) {
                        $query->whereDate('created_at', '<=', $dateTo);
                    }
                },
            ])
            ->orderBy('name')
            ->get()
            ->map(fn ($manager) => [
                'name' => $manager->name,
                'activeShipments' => (int) $manager->active_shipments_count,
            ])
            ->values()
            ->all();

        return [
            'summary' => [
                'monthlyTurnover' => round($totalRevenue, 2),
                'totalPaid' => round($totalPaid, 2),
                'activeShipments' => $activeShipments,
                'completedShipments' => $completedShipments,
                'receivable' => round($receivable, 2),
            ],
            'monthlyStats' => $monthlyStats,
            'transportShare' => $transportShare,
            'managers' => $managers,
            'charts' => [
                'moneyByMonth' => $moneyByMonth,
                'directionShare' => $directionShare,
            ],
        ];
    }

    private function financeQuery(?string $dateFrom, ?string $dateTo): Builder
    {
        $query = FinanceRecord::query();

        if ($dateFrom) {
            $query->whereDate('invoice_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('invoice_date', '<=', $dateTo);
        }

        return $query;
    }

    private function shipmentQuery(?string $dateFrom, ?string $dateTo): Builder
    {
        $query = Shipment::query();

        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        return $query;
    }

    private function invoicePeriodSql(string $chartPeriod): string
    {
        $driver = DB::connection()->getDriverName();

        return match ($chartPeriod) {
            'week' => match ($driver) {
                'pgsql' => "to_char(invoice_date, 'IYYY-IW')",
                'sqlite' => "strftime('%Y-W%W', invoice_date)",
                default => "strftime('%Y-W%W', invoice_date)",
            },
            'year' => match ($driver) {
                'pgsql' => "to_char(invoice_date, 'YYYY')",
                'sqlite' => "strftime('%Y', invoice_date)",
                default => "strftime('%Y', invoice_date)",
            },
            default => match ($driver) {
                'pgsql' => "to_char(invoice_date, 'YYYY-MM')",
                'sqlite' => "strftime('%Y-%m', invoice_date)",
                default => "strftime('%Y-%m', invoice_date)",
            },
        };
    }

    private function formatPeriodLabel(string $period, string $chartPeriod): string
    {
        if ($chartPeriod === 'year') {
            return $period;
        }

        if ($chartPeriod === 'week') {
            if (preg_match('/^(\d{4})-W(\d{1,2})$/', $period, $matches)) {
                $weekStart = Carbon::now()->setISODate((int) $matches[1], (int) $matches[2])->startOfWeek();

                return self::WEEKDAY_LABELS[$weekStart->format('D')] ?? $weekStart->format('d.m');
            }

            return $period;
        }

        if (preg_match('/^(\d{4})-(\d{2})$/', $period, $matches)) {
            return self::MONTH_LABELS[$matches[2]] ?? $period;
        }

        return $period;
    }

    private function periodStart(string $period, string $chartPeriod): ?string
    {
        if ($chartPeriod === 'month' && preg_match('/^(\d{4})-(\d{2})$/', $period, $matches)) {
            return sprintf('%s-%s-01', $matches[1], $matches[2]);
        }

        if ($chartPeriod === 'year' && preg_match('/^\d{4}$/', $period)) {
            return $period.'-01-01';
        }

        if ($chartPeriod === 'week' && preg_match('/^(\d{4})-W(\d{1,2})$/', $period, $matches)) {
            return Carbon::now()
                ->setISODate((int) $matches[1], (int) $matches[2])
                ->startOfWeek()
                ->format('Y-m-d');
        }

        return null;
    }

    private function periodEnd(string $period, string $chartPeriod): ?string
    {
        if ($chartPeriod === 'month' && preg_match('/^(\d{4})-(\d{2})$/', $period, $matches)) {
            return Carbon::createFromDate((int) $matches[1], (int) $matches[2], 1)->endOfMonth()->format('Y-m-d');
        }

        if ($chartPeriod === 'year' && preg_match('/^\d{4}$/', $period)) {
            return $period.'-12-31';
        }

        if ($chartPeriod === 'week' && preg_match('/^(\d{4})-W(\d{1,2})$/', $period, $matches)) {
            return Carbon::now()
                ->setISODate((int) $matches[1], (int) $matches[2])
                ->endOfWeek()
                ->format('Y-m-d');
        }

        return null;
    }

    /**
     * @param  Collection<int, Shipment>  $shipments
     * @return list<array{name: string, value: int, color: string}>
     */
    private function buildDirectionShare(Collection $shipments): array
    {
        $colors = [
            'Китай' => '#0B4CB8',
            'Турция' => '#2563EB',
            'Европа' => '#60A5FA',
            'СНГ' => '#93C5FD',
            'ОАЭ' => '#CBD5E1',
        ];

        $counts = [
            'Китай' => 0,
            'Турция' => 0,
            'Европа' => 0,
            'СНГ' => 0,
            'ОАЭ' => 0,
        ];

        foreach ($shipments as $shipment) {
            $region = $this->regionFromRoute($shipment->origin, $shipment->destination);
            $counts[$region]++;
        }

        $total = array_sum($counts);

        if ($total === 0) {
            return [];
        }

        return collect($counts)
            ->map(fn (int $count, string $name) => [
                'name' => $name,
                'value' => (int) round(($count / $total) * 100),
                'color' => $colors[$name],
            ])
            ->filter(fn (array $row) => $row['value'] > 0)
            ->values()
            ->all();
    }

    private function regionFromRoute(?string $origin, ?string $destination): string
    {
        $text = mb_strtolower(trim(($origin ?? '').' '.($destination ?? '')));

        if (str_contains($text, 'шанхай') || str_contains($text, 'китай') || str_contains($text, 'cn')) {
            return 'Китай';
        }
        if (str_contains($text, 'стамбул') || str_contains($text, 'турц') || str_contains($text, 'tr')) {
            return 'Турция';
        }
        if (str_contains($text, 'дубай') || str_contains($text, 'оаэ') || str_contains($text, 'ae')) {
            return 'ОАЭ';
        }
        if (
            str_contains($text, 'франкфурт')
            || str_contains($text, 'париж')
            || str_contains($text, 'москва')
            || str_contains($text, 'европ')
            || str_contains($text, 'de')
            || str_contains($text, 'fr')
        ) {
            return 'Европа';
        }

        return 'СНГ';
    }
}
