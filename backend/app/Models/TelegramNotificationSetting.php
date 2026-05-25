<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramNotificationSetting extends Model
{
    protected $table = 'telegram_notification_settings';

    protected $fillable = [
        'account_id',
        'user_id',
        'display_name',
        'telegram_chat_id',
        'telegram_username',
        'enabled',
        'notifications_enabled',
        'notify_shipment_created',
        'notify_status_changed',
        'notify_checkpoint_added',
        'last_tested_at',
        'last_test_status',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'notifications_enabled' => 'boolean',
            'notify_shipment_created' => 'boolean',
            'notify_status_changed' => 'boolean',
            'notify_checkpoint_added' => 'boolean',
            'last_tested_at' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function telegramNotificationLogs(): HasMany
    {
        return $this->hasMany(TelegramNotificationLog::class);
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

        if (array_key_exists('bot_username', $attributes)) {
            $attributes['telegram_username'] = $attributes['bot_username'];
            unset($attributes['bot_username']);
        }

        unset($attributes['bot_token_encrypted']);

        return parent::fill($attributes);
    }

    public function getChatIdAttribute(): ?string
    {
        return $this->attributes['telegram_chat_id'] ?? null;
    }

    public function getBotUsernameAttribute(): ?string
    {
        return $this->attributes['telegram_username'] ?? null;
    }

    /**
     * Bot token is env-only; never persisted on this model.
     */
    public function getBotTokenEncryptedAttribute(): ?string
    {
        return null;
    }
}
