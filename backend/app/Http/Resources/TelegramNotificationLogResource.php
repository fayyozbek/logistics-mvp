<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\TelegramNotificationLog */
class TelegramNotificationLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'eventType' => $this->event_type,
            'status' => $this->status,
            'relatedType' => $this->related_type,
            'relatedId' => $this->related_id !== null ? (string) $this->related_id : null,
            'chatId' => $this->chat_id,
            'messagePreview' => $this->message_preview,
            'telegramMessageId' => $this->telegram_message_id,
            'errorMessage' => $this->error_message,
            'sentAt' => $this->sent_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
