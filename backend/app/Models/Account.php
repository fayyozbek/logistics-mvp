<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Account extends Model
{
    public const DEFAULT_SLUG = 'default-demo';

    protected $fillable = [
        'name',
        'slug',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function telegramNotificationSetting(): HasOne
    {
        return $this->hasOne(TelegramNotificationSetting::class);
    }

    /**
     * @deprecated Use telegramNotificationSetting().
     */
    public function telegramBotConfig(): HasOne
    {
        return $this->telegramNotificationSetting();
    }

    public function telegramNotificationLogs(): HasMany
    {
        return $this->hasMany(TelegramNotificationLog::class);
    }
}
