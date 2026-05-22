<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramNotificationLog extends Model
{
    public const STATUS_SENT = 'sent';

    public const STATUS_FAILED = 'failed';

    public const STATUS_SKIPPED = 'skipped';

    public const EVENT_TEST_MESSAGE = 'test_message';

    public const EVENT_SHIPMENT_CREATED = 'shipment_created';

    public const EVENT_SHIPMENT_STATUS_CHANGED = 'shipment_status_changed';

    public const EVENT_CHECKPOINT_ADDED = 'checkpoint_added';

    public const EVENT_FINANCE_STATUS_CHANGED = 'finance_status_changed';

    protected $fillable = [
        'telegram_notification_setting_id',
        'account_id',
        'user_id',
        'event_type',
        'related_type',
        'related_id',
        'telegram_chat_id',
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

    public function telegramNotificationSetting(): BelongsTo
    {
        return $this->belongsTo(TelegramNotificationSetting::class);
    }

    /**
     * @deprecated Use telegramNotificationSetting().
     */
    public function telegramBotConfig(): BelongsTo
    {
        return $this->telegramNotificationSetting();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function fill(array $attributes): static
    {
        if (array_key_exists('chat_id', $attributes)) {
            $attributes['telegram_chat_id'] = $attributes['chat_id'];
            unset($attributes['chat_id']);
        }

        if (array_key_exists('telegram_bot_config_id', $attributes)) {
            $attributes['telegram_notification_setting_id'] = $attributes['telegram_bot_config_id'];
            unset($attributes['telegram_bot_config_id']);
        }

        return parent::fill($attributes);
    }

    public function getChatIdAttribute(): ?string
    {
        return $this->attributes['telegram_chat_id'] ?? null;
    }
}
