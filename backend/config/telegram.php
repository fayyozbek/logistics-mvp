<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Telegram Bot Token
    |--------------------------------------------------------------------------
    | Read from env TELEGRAM_BOT_TOKEN. Never exposed in API responses or logs.
    | Falls back to the encrypted bot_token stored in telegram_settings DB row
    | (resolved by TelegramBotService), allowing UI-managed token overrides.
    */
    'bot_token' => env('TELEGRAM_BOT_TOKEN') ?: null,

    /*
    |--------------------------------------------------------------------------
    | Default Chat ID
    |--------------------------------------------------------------------------
    | Optional fallback when no chat_id is stored in telegram_settings yet.
    | Useful for bootstrapping before the admin saves settings through the UI.
    */
    'default_chat_id' => env('TELEGRAM_DEFAULT_CHAT_ID') ?: null,

    /*
    |--------------------------------------------------------------------------
    | Webhook Secret
    |--------------------------------------------------------------------------
    | Random string used to validate incoming Telegram webhook POST requests
    | via the X-Telegram-Bot-Api-Secret-Token header. Required in production.
    | Leave empty for local development without a public webhook URL.
    */
    'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET') ?: null,

    /*
    |--------------------------------------------------------------------------
    | HTTP Timeout (seconds)
    |--------------------------------------------------------------------------
    | Timeout applied to outbound Telegram Bot API requests.
    */
    'timeout' => (int) env('TELEGRAM_TIMEOUT', 10),

];
