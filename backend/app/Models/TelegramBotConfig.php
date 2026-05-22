<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramBotConfig extends Model
{
    protected $fillable = [
        'account_id',
        'bot_username',
        'bot_token_encrypted',
        'chat_id',
        'enabled',
        'notifications_enabled',
        'notify_shipment_created',
        'notify_status_changed',
        'notify_checkpoint_added',
        'last_tested_at',
        'last_test_status',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'bot_token_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'bot_token_encrypted' => 'encrypted',
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

    public function telegramNotificationLogs(): HasMany
    {
        return $this->hasMany(TelegramNotificationLog::class);
    }
}
