<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateFinanceStatusRequest;
use App\Http\Resources\ClientResource;
use App\Http\Resources\FinanceRecordResource;
use App\Models\Client;
use App\Models\FinanceRecord;
use App\Services\FinanceRecordStatusService;
use App\Services\FinanceReportBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function __construct(
        private readonly FinanceReportBuilder $financeReportBuilder,
        private readonly FinanceRecordStatusService $financeRecordStatusService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = FinanceRecord::query()
            ->with('client')
            ->whereHas('shipment', fn ($query) => $query->withoutTrashed())
            ->orderByDesc('invoice_date');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json([
            'financeRecords' => FinanceRecordResource::collection($query->get())->resolve(),
            'clients' => ClientResource::collection(
                Client::query()->orderBy('company')->get()
            )->resolve(),
        ]);
    }

    public function report(): JsonResponse
    {
        return response()->json([
            'report' => $this->financeReportBuilder->build(),
        ]);
    }

    public function updateStatus(UpdateFinanceStatusRequest $request, FinanceRecord $financeRecord): JsonResponse
    {
        $financeRecord = $this->financeRecordStatusService->updateStatus(
            $financeRecord,
            $request->validated('status'),
        );

        return response()->json([
            'financeRecord' => (new FinanceRecordResource($financeRecord))->resolve(),
        ]);
    }
}
