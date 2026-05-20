<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateFinanceStatusRequest;
use App\Http\Resources\ClientResource;
use App\Http\Resources\FinanceRecordResource;
use App\Models\Client;
use App\Models\FinanceRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = FinanceRecord::query()
            ->with('client')
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
        $financeRecord->update([
            'status' => $request->validated('status'),
        ]);

        $financeRecord->load('client');

        return response()->json([
            'financeRecord' => (new FinanceRecordResource($financeRecord))->resolve(),
        ]);
    }
}
