<?php

namespace Tests\Feature;

use App\Models\TelegramSetting;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UpdateTelegramSettingsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_can_update_telegram_settings(): void
    {
        $setting = TelegramSetting::query()->firstOrFail();

        $this->patchJson('/api/telegram/settings', [
            'chatId' => '-1009876543210',
            'connected' => false,
            'eventFlags' => [
                'departure' => true,
                'checkpoint' => false,
                'customs' => true,
                'delay' => true,
                'delivery' => true,
                'payment' => true,
                'docs' => false,
            ],
        ])
            ->assertOk()
            ->assertJsonPath('settings.id', (string) $setting->id)
            ->assertJsonPath('settings.chatId', '-1009876543210')
            ->assertJsonPath('settings.connected', false)
            ->assertJsonPath('settings.eventFlags.payment', true);

        $this->assertDatabaseHas('telegram_settings', [
            'id' => $setting->id,
            'chat_id' => '-1009876543210',
            'connected' => false,
        ]);
    }

    public function test_invalid_settings_are_rejected(): void
    {
        $setting = TelegramSetting::query()->firstOrFail();

        $this->patchJson('/api/telegram/settings', [
            'connected' => 'not-a-boolean',
            'eventFlags' => [
                'unknown_event' => true,
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['connected', 'eventFlags']);

        $this->assertDatabaseHas('telegram_settings', [
            'id' => $setting->id,
            'chat_id' => $setting->chat_id,
            'connected' => $setting->connected,
        ]);
    }
}
