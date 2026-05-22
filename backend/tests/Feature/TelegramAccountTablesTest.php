<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\TelegramBotConfig;
use App\Models\TelegramNotificationLog;
use Database\Seeders\AccountTelegramSeeder;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramAccountTablesTest extends TestCase
{
    use RefreshDatabase;

    public function test_migrations_create_account_telegram_tables(): void
    {
        $this->assertTrue(
            \Illuminate\Support\Facades\Schema::hasTable('accounts'),
        );
        $this->assertTrue(
            \Illuminate\Support\Facades\Schema::hasTable('telegram_bot_configs'),
        );
        $this->assertTrue(
            \Illuminate\Support\Facades\Schema::hasTable('telegram_notification_logs'),
        );
    }

    public function test_account_telegram_seeder_creates_default_account_and_config(): void
    {
        $this->seed(AccountTelegramSeeder::class);

        $this->assertSame(1, Account::count());
        $this->assertSame(1, TelegramBotConfig::count());

        $this->assertDatabaseHas('accounts', [
            'slug' => Account::DEFAULT_SLUG,
            'name' => 'Default Demo Account',
            'is_active' => true,
        ]);

        $account = Account::query()->where('slug', Account::DEFAULT_SLUG)->firstOrFail();
        $this->assertDatabaseHas('telegram_bot_configs', [
            'account_id' => $account->id,
            'chat_id' => '-1001234567890',
            'enabled' => true,
        ]);
    }

    public function test_account_telegram_seeder_is_idempotent_when_run_twice(): void
    {
        $this->seed(AccountTelegramSeeder::class);
        $this->seed(AccountTelegramSeeder::class);

        $this->assertSame(1, Account::count());
        $this->assertSame(1, TelegramBotConfig::count());
    }

    public function test_database_seeder_includes_default_account_without_duplicates(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(1, Account::query()->where('slug', Account::DEFAULT_SLUG)->count());
        $this->assertSame(1, TelegramBotConfig::count());
    }

    public function test_bot_token_encrypted_is_hidden_from_json_serialization(): void
    {
        $account = Account::query()->create([
            'name' => 'Test Account',
            'slug' => 'test-account-token-hide',
            'is_active' => true,
        ]);

        $config = TelegramBotConfig::query()->create([
            'account_id' => $account->id,
            'bot_token_encrypted' => 'super-secret-demo-token',
            'enabled' => true,
        ]);

        $array = $config->toArray();
        $json = json_encode($config);

        $this->assertArrayNotHasKey('bot_token_encrypted', $array);
        $this->assertIsString($json);
        $this->assertStringNotContainsString('super-secret-demo-token', $json);
    }

    public function test_notification_log_belongs_to_account_and_config(): void
    {
        $account = Account::query()->create([
            'name' => 'Log Test Account',
            'slug' => 'log-test-account',
            'is_active' => true,
        ]);

        $config = TelegramBotConfig::query()->create([
            'account_id' => $account->id,
            'chat_id' => '-100999',
            'enabled' => true,
        ]);

        $log = TelegramNotificationLog::query()->create([
            'account_id' => $account->id,
            'telegram_bot_config_id' => $config->id,
            'event_type' => 'test_message',
            'related_type' => null,
            'related_id' => null,
            'chat_id' => '-100999',
            'message_preview' => 'Test preview',
            'status' => TelegramNotificationLog::STATUS_SENT,
            'telegram_message_id' => '42',
            'sent_at' => now(),
        ]);

        $this->assertTrue($log->account->is($account));
        $this->assertTrue($log->telegramBotConfig->is($config));
        $this->assertSame(1, $account->telegramNotificationLogs()->count());
        $this->assertSame(1, $config->telegramNotificationLogs()->count());
    }
}
