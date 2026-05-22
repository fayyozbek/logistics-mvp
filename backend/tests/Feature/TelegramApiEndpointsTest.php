<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\TelegramBotConfig;
use App\Models\TelegramSetting;
use Database\Seeders\DatabaseSeeder;
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

    public function test_status_returns_config_source_when_account_token_set(): void
    {
        config(['telegram.bot_token' => null]);

        $this->accountTelegramConfig([
            'bot_token_encrypted' => 'db-only-token',
            'chat_id' => '-100testchat',
            'enabled' => true,
        ]);

        $this->getJson('/api/telegram/status')
            ->assertOk()
            ->assertJsonPath('configured', true)
            ->assertJsonPath('botTokenSource', 'config');
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
        $this->accountTelegramConfig([
            'bot_token_encrypted' => 'test-token',
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
    // GET /api/telegram/settings — token safety
    // =========================================================================

    public function test_get_settings_does_not_expose_raw_token(): void
    {
        $this->seed(DatabaseSeeder::class);

        $response = $this->getJson('/api/telegram/settings')->assertOk();

        // botToken in response must be the masked placeholder or null, never the real value.
        $botToken = $response->json('settings.botToken');
        $this->assertTrue(
            $botToken === null || str_contains((string) $botToken, '•'),
            "settings.botToken must be null or masked, got: {$botToken}",
        );
    }

    // =========================================================================
    // PATCH /api/telegram/settings — token safety
    // =========================================================================

    public function test_patch_settings_does_not_expose_raw_token_in_response(): void
    {
        $this->seed(DatabaseSeeder::class);

        $response = $this->patchJson('/api/telegram/settings', [
            'chatId'    => '-100newchat',
            'connected' => true,
            'botToken'  => 'new-secret-token-sent-by-admin',
        ])->assertOk();

        // The actual token must never appear in the response body.
        $this->assertStringNotContainsString(
            'new-secret-token-sent-by-admin',
            $response->content(),
        );

        // Response must only return the masked placeholder.
        $botToken = $response->json('settings.botToken');
        $this->assertTrue(
            $botToken === null || str_contains((string) $botToken, '•'),
            "settings.botToken in PATCH response must be masked, got: {$botToken}",
        );
    }

    public function test_patch_settings_masked_token_is_not_stored(): void
    {
        $this->seed(DatabaseSeeder::class);

        // Sending the masked placeholder back must not overwrite the stored token.
        $before = TelegramSetting::query()->firstOrFail()->bot_token;

        $this->patchJson('/api/telegram/settings', [
            'chatId'   => '-100chat',
            'botToken' => '••••••••••••',   // masked — must be ignored
        ])->assertOk();

        $after = TelegramSetting::query()->firstOrFail()->bot_token;
        $this->assertSame($before, $after, 'Masked placeholder must not overwrite stored token.');
    }

    private function accountTelegramConfig(array $attributes = []): TelegramBotConfig
    {
        $account = Account::query()->firstOrCreate(
            ['slug' => Account::DEFAULT_SLUG],
            ['name' => 'Default Demo Account', 'is_active' => true],
        );

        return TelegramBotConfig::query()->updateOrCreate(
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
