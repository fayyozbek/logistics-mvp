<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TelegramSetting extends Model
{
    protected $fillable = [
        'bot_token',
        'chat_id',
        'connected',
        'event_flags',
    ];

    protected function casts(): array
    {
        return [
            'connected' => 'boolean',
            'event_flags' => 'array',
            'bot_token' => 'encrypted',
        ];
    }
}
