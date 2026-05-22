<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TelegramNotificationLogResource;
use App\Models\TelegramNotificationLog;
use App\Services\AccountContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramNotificationController extends Controller
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function index(Request $request, AccountContext $accounts): JsonResponse
    {
        $account = $accounts->current();

        $query = TelegramNotificationLog::query()
            ->where('account_id', $account->id)
            ->orderByDesc('created_at');

        $status = $request->query('status');
        if (is_string($status) && $status !== '') {
            $query->where('status', $status);
        }

        $eventType = $request->query('event_type');
        if (is_string($eventType) && $eventType !== '') {
            $query->where('event_type', $eventType);
        }

        $limit = min(max(1, (int) $request->query('limit', self::DEFAULT_LIMIT)), self::MAX_LIMIT);
        $page = max(1, (int) $request->query('page', 1));
        $total = (clone $query)->count();

        $logs = $query
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get();

        return response()->json([
            'notifications' => TelegramNotificationLogResource::collection($logs)->resolve(),
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
            ],
        ]);
    }
}
