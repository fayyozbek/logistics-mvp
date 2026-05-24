<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\TelegramNotificationSetting;
use Database\Seeders\AccountTelegramSeeder;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class UpdateTelegramSettingsApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAsAdmin();
    }

    public function test_can_update_telegram_notification_settings(): void
    {
        $setting = $this->currentSetting();

        $this->patchJson('/api/telegram/settings', [
            'telegramChatId' => '-1009876543210',
            'enabled' => false,
            'notificationsEnabled' => true,
            'notifyShipmentCreated' => true,
            'notifyStatusChanged' => false,
            'notifyCheckpointAdded' => true,
            'displayName' => 'QA Demo',
        ])
            ->assertOk()
            ->assertJsonPath('settings.id', (string) $setting->id)
            ->assertJsonPath('settings.telegramChatId', '-1009876543210')
            ->assertJsonPath('settings.enabled', false)
            ->assertJsonPath('settings.displayName', 'QA Demo')
            ->assertJsonPath('settings.notifyStatusChanged', false);

        $this->assertDatabaseHas('telegram_notification_settings', [
            'id' => $setting->id,
            'telegram_chat_id' => '-1009876543210',
            'enabled' => false,
            'display_name' => 'QA Demo',
        ]);
    }

    public function test_invalid_settings_are_rejected(): void
    {
        $setting = $this->currentSetting();

        $this->patchJson('/api/telegram/settings', [
            'enabled' => 'not-a-boolean',
            'botToken' => 'secret-token',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['enabled', 'botToken']);

        $this->assertDatabaseHas('telegram_notification_settings', [
            'id' => $setting->id,
            'telegram_chat_id' => $setting->telegram_chat_id,
            'enabled' => $setting->enabled,
        ]);
    }

    public function test_legacy_chat_id_and_connected_aliases_are_mapped(): void
    {
        $setting = $this->currentSetting();

        $this->patchJson('/api/telegram/settings', [
            'chatId' => '-100legacy',
            'connected' => true,
        ])
            ->assertOk()
            ->assertJsonPath('settings.telegramChatId', '-100legacy')
            ->assertJsonPath('settings.enabled', true);

        $this->assertDatabaseHas('telegram_notification_settings', [
            'id' => $setting->id,
            'telegram_chat_id' => '-100legacy',
            'enabled' => true,
        ]);
    }

    private function currentSetting(): TelegramNotificationSetting
    {
        $account = Account::query()->where('slug', Account::DEFAULT_SLUG)->firstOrFail();

        return TelegramNotificationSetting::query()
            ->where('account_id', $account->id)
            ->firstOrFail();
    }
}
