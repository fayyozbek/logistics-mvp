<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\TelegramNotificationLog;
use App\Models\TelegramNotificationSetting;
use Database\Seeders\AccountTelegramSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\Support\DemoAccounts;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TelegramAccountTablesTest extends TestCase
{
    use RefreshDatabase;

    public function test_migrations_create_account_telegram_tables(): void
    {
        $this->assertTrue(Schema::hasTable('accounts'));
        $this->assertTrue(Schema::hasTable('telegram_notification_settings'));
        $this->assertTrue(Schema::hasTable('telegram_notification_logs'));
        $this->assertFalse(Schema::hasTable('telegram_bot_configs'));
        $this->assertFalse(Schema::hasColumn('telegram_notification_settings', 'bot_token_encrypted'));
    }

    public function test_account_telegram_seeder_creates_demo_accounts_and_settings(): void
    {
        $this->seed(AccountTelegramSeeder::class);

        $this->assertSame(5, Account::count());
        $this->assertSame(5, TelegramNotificationSetting::count());

        $admin = DemoAccounts::all()[0];

        $this->assertDatabaseHas('accounts', [
            'slug' => DemoAccounts::ADMIN_SLUG,
            'name' => 'Admin Demo Account',
            'is_active' => true,
        ]);

        $account = Account::query()->where('slug', DemoAccounts::ADMIN_SLUG)->firstOrFail();
        $this->assertDatabaseHas('telegram_notification_settings', [
            'account_id' => $account->id,
            'telegram_chat_id' => $admin['telegram_chat_id'],
            'display_name' => $admin['telegram_display_name'],
            'enabled' => true,
        ]);
    }

    public function test_account_telegram_seeder_is_idempotent_when_run_twice(): void
    {
        $this->seed(AccountTelegramSeeder::class);
        $this->seed(AccountTelegramSeeder::class);

        $this->assertSame(5, Account::count());
        $this->assertSame(5, TelegramNotificationSetting::count());
    }

    public function test_database_seeder_includes_demo_settings_without_duplicates(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(1, Account::query()->where('slug', DemoAccounts::ADMIN_SLUG)->count());
        $this->assertSame(5, Account::count());
        $this->assertSame(5, TelegramNotificationSetting::count());
    }

    public function test_notification_setting_has_no_token_fields_in_serialization(): void
    {
        $account = Account::query()->create([
            'name' => 'Test Account',
            'slug' => 'test-account-token-hide',
            'is_active' => true,
        ]);

        $setting = TelegramNotificationSetting::query()->create([
            'account_id' => $account->id,
            'telegram_chat_id' => '-100demo',
            'enabled' => true,
        ]);

        $array = $setting->toArray();
        $json = json_encode($setting);

        $this->assertArrayNotHasKey('bot_token', $array);
        $this->assertArrayNotHasKey('bot_token_encrypted', $array);
        $this->assertIsString($json);
        $this->assertStringNotContainsString('token', strtolower($json));
    }

    public function test_notification_log_belongs_to_account_and_setting(): void
    {
        $account = Account::query()->create([
            'name' => 'Log Test Account',
            'slug' => 'log-test-account',
            'is_active' => true,
        ]);

        $setting = TelegramNotificationSetting::query()->create([
            'account_id' => $account->id,
            'telegram_chat_id' => '-100999',
            'enabled' => true,
        ]);

        $log = TelegramNotificationLog::query()->create([
            'account_id' => $account->id,
            'telegram_notification_setting_id' => $setting->id,
            'event_type' => 'test_message',
            'related_type' => null,
            'related_id' => null,
            'telegram_chat_id' => '-100999',
            'message_preview' => 'Test preview',
            'status' => TelegramNotificationLog::STATUS_SENT,
            'telegram_message_id' => '42',
            'sent_at' => now(),
        ]);

        $this->assertTrue($log->account->is($account));
        $this->assertTrue($log->telegramNotificationSetting->is($setting));
        $this->assertSame(1, $account->telegramNotificationLogs()->count());
        $this->assertSame(1, $setting->telegramNotificationLogs()->count());
    }

    public function test_logs_can_be_created_with_legacy_service_attribute_keys(): void
    {
        $account = Account::query()->create([
            'name' => 'Legacy Keys',
            'slug' => 'legacy-keys-account',
            'is_active' => true,
        ]);

        $setting = TelegramNotificationSetting::query()->create([
            'account_id' => $account->id,
            'enabled' => true,
        ]);

        $log = TelegramNotificationLog::query()->create([
            'account_id' => $account->id,
            'telegram_bot_config_id' => $setting->id,
            'event_type' => 'test_message',
            'chat_id' => '-100legacy',
            'status' => TelegramNotificationLog::STATUS_SENT,
        ]);

        $this->assertSame($setting->id, $log->telegram_notification_setting_id);
        $this->assertSame('-100legacy', $log->telegram_chat_id);
    }
}
