<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\TelegramNotificationSetting;
use App\Models\User;
use Database\Seeders\AccountTelegramSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\Support\DemoAccounts;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DemoAccountsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_migrate_fresh_seed_creates_all_demo_users_with_accounts(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(5, User::count());
        $this->assertSame(5, Account::count());
        $this->assertSame(5, TelegramNotificationSetting::count());

        foreach (DemoAccounts::all() as $row) {
            $this->assertDatabaseHas('accounts', [
                'slug' => $row['slug'],
                'name' => $row['name'],
                'is_active' => true,
            ]);

            $account = Account::query()->where('slug', $row['slug'])->firstOrFail();

            $this->assertDatabaseHas('users', [
                'email' => $row['email'],
                'account_id' => $account->id,
            ]);

            $this->assertDatabaseHas('telegram_notification_settings', [
                'account_id' => $account->id,
                'display_name' => $row['telegram_display_name'],
                'telegram_chat_id' => $row['telegram_chat_id'],
            ]);
        }
    }

    public function test_db_seed_twice_does_not_duplicate_accounts_users_or_settings(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(5, User::count());
        $this->assertSame(5, Account::count());
        $this->assertSame(5, TelegramNotificationSetting::count());
    }

    public function test_demo_user_telegram_settings_are_isolated_between_accounts(): void
    {
        $this->seed(UserSeeder::class);
        $this->seed(AccountTelegramSeeder::class);

        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $manager = User::query()->where('email', 'manager@example.com')->firstOrFail();

        $this->assertNotSame($admin->account_id, $manager->account_id);

        Sanctum::actingAs($admin);
        $this->patchJson('/api/telegram/settings', [
            'telegramChatId' => '-100-admin-only',
            'displayName' => 'Admin Isolated',
        ])->assertOk();

        Sanctum::actingAs($manager);
        $this->getJson('/api/telegram/settings')
            ->assertOk()
            ->assertJsonPath('settings.telegramChatId', '-1001234567891')
            ->assertJsonPath('settings.displayName', 'Manager Demo');

        $this->assertDatabaseHas('telegram_notification_settings', [
            'account_id' => $admin->account_id,
            'telegram_chat_id' => '-100-admin-only',
            'display_name' => 'Admin Isolated',
        ]);

        $this->assertDatabaseHas('telegram_notification_settings', [
            'account_id' => $manager->account_id,
            'telegram_chat_id' => '-1001234567891',
            'display_name' => 'Manager Demo',
        ]);
    }
}
