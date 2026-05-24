<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardMetricsBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardMetricsBuilder $metrics,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'chart_period' => ['nullable', 'in:week,month,year'],
        ]);

        return response()->json(
            $this->metrics->build(
                $validated['date_from'] ?? null,
                $validated['date_to'] ?? null,
                $validated['chart_period'] ?? 'month',
            ),
        );
    }
}
