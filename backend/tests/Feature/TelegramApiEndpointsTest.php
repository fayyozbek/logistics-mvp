<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\TelegramNotificationSetting;
use Database\Seeders\AccountTelegramSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelegramApiEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure no env token leaks into tests unless explicitly set.
        config(['telegram.bot_token' => null, 'telegram.default_chat_id' => null]);
    }

    // =========================================================================
    // GET /api/telegram/status
    // =========================================================================

    public function test_status_returns_not_configured_when_token_missing(): void
    {
        // No env token, no DB row → completely unconfigured.
        $this->getJson('/api/telegram/status')
            ->assertOk()
            ->assertJsonPath('configured', false)
            ->assertJsonPath('enabled', false)
            ->assertJsonPath('hasChatId', false)
            ->assertJsonPath('notificationsEnabled', false)
            ->assertJsonPath('botTokenSource', null);
    }

    public function test_status_returns_configured_true_when_env_token_set(): void
    {
        config(['telegram.bot_token' => 'test-env-token']);

        $this->accountTelegramConfig([
            'chat_id' => '-100testchat',
            'enabled' => true,
            'notify_shipment_created' => true,
            'notify_checkpoint_added' => false,
        ]);

        $this->getJson('/api/telegram/status')
            ->assertOk()
            ->assertJsonPath('configured', true)
            ->assertJsonPath('enabled', true)
            ->assertJsonPath('hasChatId', true)
            ->assertJsonPath('notificationsEnabled', true)
            ->assertJsonPath('botTokenSource', 'env');
    }

    public function test_status_not_configured_when_only_chat_id_without_env_token(): void
    {
        config(['telegram.bot_token' => null]);

        $this->accountTelegramConfig([
            'chat_id' => '-100testchat',
            'enabled' => true,
        ]);

        $this->getJson('/api/telegram/status')
            ->assertOk()
            ->assertJsonPath('configured', false)
            ->assertJsonPath('botTokenSource', null);
    }

    public function test_status_notifications_enabled_requires_enabled_and_active_toggles(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $this->accountTelegramConfig([
            'chat_id' => '-100chat',
            'enabled' => false,
            'notify_shipment_created' => true,
            'notify_status_changed' => true,
        ]);

        $this->getJson('/api/telegram/status')
            ->assertOk()
            ->assertJsonPath('notificationsEnabled', false);
    }

    public function test_status_does_not_expose_token(): void
    {
        config(['telegram.bot_token' => 'super-secret-status-token']);

        $response = $this->getJson('/api/telegram/status')->assertOk();

        $this->assertStringNotContainsString(
            'super-secret-status-token',
            $response->content(),
        );
    }

    // =========================================================================
    // POST /api/telegram/test-message
    // =========================================================================

    public function test_test_message_returns_422_when_token_missing(): void
    {
        // No env token, no DB token.
        $this->postJson('/api/telegram/test-message', [
            'chatId' => '-100chat',
        ])
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_test_message_returns_422_when_chat_id_missing(): void
    {
        config(['telegram.bot_token' => 'test-token']);
        // No chatId in request, no chat_id in DB, no default_chat_id in env.

        $this->postJson('/api/telegram/test-message')
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_test_message_returns_422_when_custom_message_has_no_chat_id(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        // Custom message but no chatId anywhere.
        $this->postJson('/api/telegram/test-message', [
            'message' => 'Custom test text',
        ])
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_test_message_succeeds_with_configured_token_and_chat_id(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        Http::fake([
            '*' => Http::response([
                'ok'     => true,
                'result' => ['message_id' => 77],
            ], 200),
        ]);

        $this->postJson('/api/telegram/test-message', ['chatId' => '-100chat'])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('telegram_message_id', 77);
    }

    public function test_test_message_succeeds_using_account_config_chat_id(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $this->accountTelegramConfig([
            'chat_id' => '-100dbchat',
            'enabled' => true,
        ]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 5]], 200)]);

        $this->postJson('/api/telegram/test-message')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_test_message_returns_502_on_telegram_api_failure(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        Http::fake([
            '*' => Http::response([
                'ok'          => false,
                'description' => 'Bad Request: chat not found',
            ], 400),
        ]);

        $this->postJson('/api/telegram/test-message', ['chatId' => '-100chat'])
            ->assertStatus(502)
            ->assertJsonPath('success', false);
    }

    public function test_test_message_returns_502_on_network_error(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        Http::fake(function () {
            throw new \Illuminate\Http\Client\ConnectionException('timeout');
        });

        $this->postJson('/api/telegram/test-message', ['chatId' => '-100chat'])
            ->assertStatus(502)
            ->assertJsonPath('success', false);
    }

    public function test_test_message_does_not_expose_token_in_response(): void
    {
        $secret = 'do-not-leak-this-token';
        config(['telegram.bot_token' => $secret]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);

        $response = $this->postJson('/api/telegram/test-message', ['chatId' => '-100chat'])
            ->assertOk();

        $this->assertStringNotContainsString($secret, $response->content());
    }

    public function test_test_message_sends_custom_message_when_provided(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 3]], 200)]);

        $this->postJson('/api/telegram/test-message', [
            'chatId'  => '-100chat',
            'message' => 'Custom hello from QA',
        ])->assertOk()->assertJsonPath('success', true);

        Http::assertSent(function ($request) {
            return $request->data()['text'] === 'Custom hello from QA'
                && $request->data()['chat_id'] === '-100chat';
        });
    }

    public function test_test_message_validates_chat_id_max_length(): void
    {
        $this->postJson('/api/telegram/test-message', [
            'chatId' => str_repeat('x', 65),    // exceeds max:64
        ])->assertUnprocessable();
    }

    public function test_test_message_validates_message_max_length(): void
    {
        $this->postJson('/api/telegram/test-message', [
            'message' => str_repeat('x', 4097),  // exceeds max:4096
        ])->assertUnprocessable();
    }

    // =========================================================================
    // GET /api/telegram/settings
    // =========================================================================

    public function test_get_settings_returns_safe_notification_fields(): void
    {
        $this->seed(AccountTelegramSeeder::class);

        $response = $this->getJson('/api/telegram/settings')->assertOk();

        $response->assertJsonStructure([
            'settings' => [
                'id',
                'displayName',
                'telegramChatId',
                'telegramUsername',
                'enabled',
                'notificationsEnabled',
                'notifyShipmentCreated',
                'notifyStatusChanged',
                'notifyCheckpointAdded',
                'lastTestedAt',
                'lastTestStatus',
            ],
            'shipments',
        ]);

        $this->assertArrayNotHasKey('botToken', $response->json('settings') ?? []);
        $this->assertStringNotContainsString('token', strtolower($response->content()));
    }

    // =========================================================================
    // PATCH /api/telegram/settings
    // =========================================================================

    public function test_patch_settings_updates_chat_id_and_preferences(): void
    {
        $this->seed(AccountTelegramSeeder::class);

        $this->patchJson('/api/telegram/settings', [
            'telegramChatId' => '-100newchat',
            'enabled' => true,
            'notifyShipmentCreated' => false,
        ])
            ->assertOk()
            ->assertJsonPath('settings.telegramChatId', '-100newchat')
            ->assertJsonPath('settings.enabled', true)
            ->assertJsonPath('settings.notifyShipmentCreated', false);

        $this->assertDatabaseHas('telegram_notification_settings', [
            'telegram_chat_id' => '-100newchat',
            'enabled' => true,
            'notify_shipment_created' => false,
        ]);
    }

    public function test_patch_settings_rejects_bot_token_field(): void
    {
        $this->seed(AccountTelegramSeeder::class);

        $this->patchJson('/api/telegram/settings', [
            'telegramChatId' => '-100chat',
            'botToken' => 'new-secret-token-sent-by-admin',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['botToken']);
    }

    public function test_patch_settings_does_not_expose_secrets_in_response(): void
    {
        $this->seed(AccountTelegramSeeder::class);

        $response = $this->patchJson('/api/telegram/settings', [
            'telegramChatId' => '-100safe',
            'enabled' => true,
        ])->assertOk();

        $this->assertArrayNotHasKey('botToken', $response->json('settings') ?? []);
        $this->assertStringNotContainsString('secret', strtolower($response->content()));
    }

    private function accountTelegramConfig(array $attributes = []): TelegramNotificationSetting
    {
        unset($attributes['bot_token_encrypted']);

        $account = Account::query()->firstOrCreate(
            ['slug' => Account::DEFAULT_SLUG],
            ['name' => 'Default Demo Account', 'is_active' => true],
        );

        return TelegramNotificationSetting::query()->updateOrCreate(
            ['account_id' => $account->id],
            array_merge([
                'enabled' => true,
                'notifications_enabled' => true,
                'notify_shipment_created' => true,
                'notify_status_changed' => true,
                'notify_checkpoint_added' => true,
            ], $attributes),
        );
    }
}
