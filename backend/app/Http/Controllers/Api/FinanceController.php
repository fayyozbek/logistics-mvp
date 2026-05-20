<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
}
