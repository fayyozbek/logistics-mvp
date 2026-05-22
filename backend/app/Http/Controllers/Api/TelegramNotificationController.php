<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TelegramNotificationLogResource;
use App\Models\TelegramNotificationLog;
use App\Services\TelegramBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramNotificationController extends Controller
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function index(Request $request, TelegramBotService $telegram): JsonResponse
    {
        $accountId = $telegram->getCurrentSetting()?->account_id
            ?? ($telegram->currentAccount()->id ?? null);

        $query = TelegramNotificationLog::query()->orderByDesc('created_at');

        if ($accountId !== null) {
            $query->where('account_id', $accountId);
        }

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
