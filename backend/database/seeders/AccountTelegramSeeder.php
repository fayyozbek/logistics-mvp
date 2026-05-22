<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\TelegramNotificationSetting;
use Database\Seeders\Support\DemoData;
use Illuminate\Database\Seeder;

class AccountTelegramSeeder extends Seeder
{
    public function run(): void
    {
        $account = Account::query()->updateOrCreate(
            ['slug' => Account::DEFAULT_SLUG],
            [
                'name' => 'Default Demo Account',
                'is_active' => true,
            ],
        );

        $legacy = DemoData::telegramSettings();

        TelegramNotificationSetting::query()->updateOrCreate(
            ['account_id' => $account->id],
            [
                'display_name' => 'Default Demo',
                'telegram_username' => 'LogistixNotifyBot',
                'telegram_chat_id' => $legacy['chat_id'] ?? null,
                'enabled' => (bool) ($legacy['connected'] ?? false),
                'notifications_enabled' => true,
                'notify_shipment_created' => (bool) ($legacy['event_flags']['departure'] ?? true),
                'notify_status_changed' => true,
                'notify_checkpoint_added' => (bool) ($legacy['event_flags']['checkpoint'] ?? true),
            ],
        );
    }
}
