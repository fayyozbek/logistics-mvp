<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateFinanceStatusRequest;
use App\Http\Resources\ClientResource;
use App\Http\Resources\FinanceRecordResource;
use App\Models\Client;
use App\Models\FinanceRecord;
use Database\Seeders\Support\FinanceAmountRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = FinanceRecord::query()
            ->with('client')
            ->whereHas('shipment')
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

    public function updateStatus(UpdateFinanceStatusRequest $request, FinanceRecord $financeRecord): JsonResponse
    {
        $status = $request->validated('status');
        $synced = FinanceAmountRules::apply([
            'total_amount' => $financeRecord->total_amount,
            'paid_amount' => $financeRecord->paid_amount,
            'status' => $status,
        ]);

        $financeRecord->update([
            'status' => $synced['status'],
            'paid_amount' => $synced['paid_amount'],
        ]);

        $financeRecord->load('client');

        return response()->json([
            'financeRecord' => (new FinanceRecordResource($financeRecord))->resolve(),
        ]);
    }
}
