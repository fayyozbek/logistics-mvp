<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramNotificationLog extends Model
{
    public const STATUS_SENT = 'sent';

    public const STATUS_FAILED = 'failed';

    public const STATUS_SKIPPED = 'skipped';

    protected $fillable = [
        'account_id',
        'telegram_bot_config_id',
        'event_type',
        'related_type',
        'related_id',
        'chat_id',
        'message_preview',
        'status',
        'telegram_message_id',
        'error_message',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function telegramBotConfig(): BelongsTo
    {
        return $this->belongsTo(TelegramBotConfig::class);
    }
}
