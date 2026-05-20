<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinanceRecord;
use App\Models\Manager;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $totalRevenue = (float) FinanceRecord::query()->sum('total_amount');
        $totalPaid = (float) FinanceRecord::query()->sum('paid_amount');
        $receivable = $totalRevenue - $totalPaid;

        $activeShipments = Shipment::query()
            ->whereIn('status', ['planned', 'in_transit', 'at_checkpoint', 'delayed'])
            ->count();

        $completedShipments = Shipment::query()->where('status', 'delivered')->count();

        $transportShare = Shipment::query()
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
            ->values();

        $monthlyStats = FinanceRecord::query()
            ->selectRaw("strftime('%Y-%m', invoice_date) as period")
            ->selectRaw('count(*) as shipments')
            ->selectRaw('sum(total_amount) as revenue')
            ->whereNotNull('invoice_date')
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(fn ($row) => [
                'month' => $row->period,
                'shipments' => (int) $row->shipments,
                'revenue' => (float) $row->revenue,
            ]);

        // SQLite strftime works in tests; MySQL would need date_format — acceptable for MVP seed data.

        $managers = Manager::query()
            ->withCount([
                'shipments as active_shipments_count' => fn ($query) => $query->whereIn('status', ['planned', 'in_transit', 'at_checkpoint', 'delayed']),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn ($manager) => [
                'name' => $manager->name,
                'activeShipments' => (int) $manager->active_shipments_count,
            ]);

        return response()->json([
            'summary' => [
                'monthlyTurnover' => $totalRevenue,
                'totalPaid' => $totalPaid,
                'activeShipments' => $activeShipments,
                'completedShipments' => $completedShipments,
                'receivable' => $receivable,
            ],
            'monthlyStats' => $monthlyStats,
            'transportShare' => $transportShare,
            'managers' => $managers,
            'charts' => [
                'moneyByMonth' => [
                    ['month' => 'Апр', 'turnover' => 212000, 'paid' => 166000, 'shipments' => 64, 'active' => 14],
                    ['month' => 'Май', 'turnover' => (int) $totalRevenue, 'paid' => (int) $totalPaid, 'shipments' => Shipment::count(), 'active' => $activeShipments],
                ],
                'directionShare' => [
                    ['name' => 'Китай', 'value' => 36, 'color' => '#0B4CB8'],
                    ['name' => 'Турция', 'value' => 22, 'color' => '#2563EB'],
                    ['name' => 'Европа', 'value' => 18, 'color' => '#60A5FA'],
                    ['name' => 'СНГ', 'value' => 14, 'color' => '#93C5FD'],
                    ['name' => 'ОАЭ', 'value' => 10, 'color' => '#CBD5E1'],
                ],
            ],
        ]);
    }
}
