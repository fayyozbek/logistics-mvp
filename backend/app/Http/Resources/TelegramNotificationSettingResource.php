<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\TelegramNotificationSetting */
class TelegramNotificationSettingResource extends JsonResource
{
    /**
     * Safe per-account notification settings (no bot token or secrets).
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'displayName' => $this->display_name,
            'telegramChatId' => $this->telegram_chat_id,
            'telegramUsername' => $this->telegram_username,
            'enabled' => (bool) $this->enabled,
            'notificationsEnabled' => (bool) $this->notifications_enabled,
            'notifyShipmentCreated' => (bool) $this->notify_shipment_created,
            'notifyStatusChanged' => (bool) $this->notify_status_changed,
            'notifyCheckpointAdded' => (bool) $this->notify_checkpoint_added,
            'lastTestedAt' => $this->last_tested_at?->toIso8601String(),
            'lastTestStatus' => $this->last_test_status,
        ];
    }
}
