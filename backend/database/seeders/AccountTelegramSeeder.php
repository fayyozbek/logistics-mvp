<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\TelegramNotificationSetting;
use Database\Seeders\Support\DemoAccounts;
use Database\Seeders\Support\DemoData;
use Illuminate\Database\Seeder;

class AccountTelegramSeeder extends Seeder
{
    public function run(): void
    {
        $legacy = DemoData::telegramSettings();

        foreach (DemoAccounts::all() as $row) {
            $account = Account::query()->updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'name' => $row['name'],
                    'is_active' => true,
                ],
            );

            $isPrimaryAdmin = $row['slug'] === DemoAccounts::ADMIN_SLUG;

            TelegramNotificationSetting::query()->updateOrCreate(
                ['account_id' => $account->id],
                [
                    'display_name' => $row['telegram_display_name'],
                    'telegram_username' => 'LogistixNotifyBot',
                    'telegram_chat_id' => $row['telegram_chat_id'],
                    'enabled' => $isPrimaryAdmin && (bool) ($legacy['connected'] ?? false),
                    'notifications_enabled' => true,
                    'notify_shipment_created' => (bool) ($legacy['event_flags']['departure'] ?? true),
                    'notify_status_changed' => true,
                    'notify_checkpoint_added' => (bool) ($legacy['event_flags']['checkpoint'] ?? true),
                ],
            );
        }
    }
}
