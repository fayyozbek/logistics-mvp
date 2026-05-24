<?php

namespace App\Http\Resources;

use App\Models\TelegramSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TelegramSetting */
class TelegramSettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'botToken' => $this->bot_token ? '••••••••••••' : null,
            'chatId' => $this->chat_id,
            'connected' => (bool) $this->connected,
            'eventFlags' => $this->event_flags ?? [],
        ];
    }
}
