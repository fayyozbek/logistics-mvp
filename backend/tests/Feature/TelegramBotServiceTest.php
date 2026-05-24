<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Checkpoint;
use App\Models\Client;
use App\Models\Manager;
use App\Models\Shipment;
use App\Models\TelegramNotificationLog;
use App\Models\TelegramNotificationSetting;
use App\Services\TelegramBotService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelegramBotServiceTest extends TestCase
{
    use RefreshDatabase;

    private TelegramBotService $telegram;

    protected function setUp(): void
    {
        parent::setUp();

        // Start each test with a blank Telegram token env so no real calls
        // are made accidentally. Individual tests configure what they need.
        config(['telegram.bot_token' => null, 'telegram.default_chat_id' => null]);

        $this->telegram = app(TelegramBotService::class);
    }

    // -------------------------------------------------------------------------
    // isConfigured()
    // -------------------------------------------------------------------------

    public function test_service_reports_not_configured_when_token_missing(): void
    {
        // No env token, no DB row with a token (RefreshDatabase gives us empty DB)
        $this->assertFalse($this->telegram->isConfigured());
    }

    public function test_service_reports_configured_when_env_token_set(): void
    {
        config(['telegram.bot_token' => 'test-token-abc']);

        $this->assertTrue($this->telegram->isConfigured());
    }

    public function test_service_reports_not_configured_when_only_chat_id_in_settings(): void
    {
        $this->accountConfig(['chat_id' => '-100000']);

        $this->assertFalse($this->telegram->isConfigured());
    }

    // -------------------------------------------------------------------------
    // sendMessage() – failure paths
    // -------------------------------------------------------------------------

    public function test_send_message_returns_failure_when_token_missing(): void
    {
        $result = $this->telegram->sendMessage('Hello', '-100chat');

        $this->assertFalse($result['success']);
        $this->assertSame('missing_token', $result['error']);
        $this->assertNull($result['telegram_message_id']);
    }

    public function test_send_message_returns_failure_when_chat_id_empty(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $result = $this->telegram->sendMessage('Hello', '');

        $this->assertFalse($result['success']);
        $this->assertSame('missing_chat_id', $result['error']);
        $this->assertNull($result['telegram_message_id']);
    }

    public function test_send_message_returns_failure_on_telegram_ok_false(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        Http::fake([
            '*' => Http::response([
                'ok'          => false,
                'description' => 'Bad Request: chat not found',
            ], 400),
        ]);

        $result = $this->telegram->sendMessage('Hello', '-100chat');

        $this->assertFalse($result['success']);
        $this->assertSame('api_error', $result['error']);
        $this->assertNull($result['telegram_message_id']);
    }

    public function test_send_message_returns_failure_on_network_error(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        Http::fake(function () {
            throw new ConnectionException('Connection refused');
        });

        $result = $this->telegram->sendMessage('Hello', '-100chat');

        $this->assertFalse($result['success']);
        $this->assertSame('network_error', $result['error']);
        $this->assertNull($result['telegram_message_id']);
    }

    // -------------------------------------------------------------------------
    // sendMessage() – success path and request shape
    // -------------------------------------------------------------------------

    public function test_send_message_sends_correct_request_to_telegram_api(): void
    {
        config(['telegram.bot_token' => 'test-token-123']);

        Http::fake([
            '*' => Http::response(['ok' => true, 'result' => ['message_id' => 42]], 200),
        ]);

        $this->telegram->sendMessage('Test message body', '-100testchat');

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/sendMessage')
                && $request->data()['chat_id'] === '-100testchat'
                && $request->data()['text'] === 'Test message body';
        });
    }

    public function test_send_message_handles_telegram_success_response(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        Http::fake([
            '*' => Http::response([
                'ok'     => true,
                'result' => ['message_id' => 99],
            ], 200),
        ]);

        $result = $this->telegram->sendMessage('Hello', '-100chat');

        $this->assertTrue($result['success']);
        $this->assertSame(99, $result['telegram_message_id']);
        $this->assertNull($result['error']);
    }

    // -------------------------------------------------------------------------
    // Security: bot token must not appear in returned results
    // -------------------------------------------------------------------------

    public function test_bot_token_is_not_included_in_returned_result(): void
    {
        $secretToken = 'super-secret-bot-token-should-not-leak';
        config(['telegram.bot_token' => $secretToken]);

        Http::fake([
            '*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200),
        ]);

        $result = $this->telegram->sendMessage('-100chat', 'Test');

        $serialised = json_encode($result);
        $this->assertIsString($serialised);
        $this->assertStringNotContainsString($secretToken, $serialised);
    }

    // -------------------------------------------------------------------------
    // sendTestMessage()
    // -------------------------------------------------------------------------

    public function test_send_test_message_fails_when_no_chat_id_configured(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $result = $this->telegram->sendTestMessage();

        $this->assertFalse($result['success']);
        $this->assertSame('missing_chat_id', $result['error']);
    }

    public function test_send_test_message_succeeds_with_explicit_chat_id(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        Http::fake([
            '*' => Http::response(['ok' => true, 'result' => ['message_id' => 7]], 200),
        ]);

        $result = $this->telegram->sendTestMessage(null, '-100testchat');

        $this->assertTrue($result['success']);
        $this->assertSame(7, $result['telegram_message_id']);
    }

    public function test_send_test_message_uses_account_config_chat_id_when_not_overridden(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $account = $this->defaultAccount();
        $this->accountConfig([
            'chat_id' => '-100dbchat',
            'enabled' => true,
        ]);

        Http::fake([
            '*' => Http::response(['ok' => true, 'result' => ['message_id' => 10]], 200),
        ]);

        $result = $this->telegram->sendTestMessage();

        $this->assertTrue($result['success']);

        Http::assertSent(function ($request) {
            return $request->data()['chat_id'] === '-100dbchat';
        });
    }

    // -------------------------------------------------------------------------
    // sendShipmentCreatedNotification()
    // -------------------------------------------------------------------------

    public function test_shipment_created_notification_contains_tracking_number(): void
    {
        config(['telegram.bot_token' => 'test-token', 'telegram.default_chat_id' => '-100chat']);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);

        $shipment = $this->makeShipment(['tracking_number' => 'LGX-2026-TEST']);

        $result = $this->telegram->sendShipmentCreatedNotification($shipment);

        $this->assertTrue($result['success']);

        Http::assertSent(function ($request) {
            return str_contains($request->data()['text'], 'LGX-2026-TEST');
        });
    }

    public function test_shipment_created_notification_fails_without_chat_id(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $shipment = $this->makeShipment();

        $result = $this->telegram->sendShipmentCreatedNotification($shipment);

        $this->assertFalse($result['success']);
        $this->assertSame('missing_chat_id', $result['error']);
    }

    // -------------------------------------------------------------------------
    // sendShipmentStatusChangedNotification()
    // -------------------------------------------------------------------------

    public function test_status_changed_notification_contains_old_and_new_status(): void
    {
        config(['telegram.bot_token' => 'test-token', 'telegram.default_chat_id' => '-100chat']);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 2]], 200)]);

        $shipment = $this->makeShipment();

        $result = $this->telegram->sendShipmentStatusChangedNotification(
            $shipment, 'planned', 'in_transit',
        );

        $this->assertTrue($result['success']);

        Http::assertSent(function ($request) {
            $text = $request->data()['text'];

            return str_contains($text, 'Запланирован') && str_contains($text, 'В пути');
        });
    }

    // -------------------------------------------------------------------------
    // sendCheckpointAddedNotification()
    // -------------------------------------------------------------------------

    public function test_checkpoint_notification_contains_location(): void
    {
        config(['telegram.bot_token' => 'test-token', 'telegram.default_chat_id' => '-100chat']);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 3]], 200)]);

        $shipment    = $this->makeShipment();
        $checkpoint  = $this->makeCheckpoint($shipment, ['city' => 'Almaty', 'country' => 'KZ']);

        $result = $this->telegram->sendCheckpointAddedNotification($shipment, $checkpoint);

        $this->assertTrue($result['success']);

        Http::assertSent(function ($request) {
            return str_contains($request->data()['text'], 'Almaty');
        });
    }

    // -------------------------------------------------------------------------
    // getDefaultChatId()
    // -------------------------------------------------------------------------

    public function test_get_default_chat_id_returns_account_config_value(): void
    {
        $this->accountConfig(['chat_id' => '-100fromdb', 'enabled' => true]);

        $this->assertSame('-100fromdb', $this->telegram->getDefaultChatId());
    }

    public function test_get_default_chat_id_falls_back_to_env(): void
    {
        config(['telegram.default_chat_id' => '-100fromenv']);

        $this->assertSame('-100fromenv', $this->telegram->getDefaultChatId());
    }

    public function test_get_default_chat_id_returns_null_when_nothing_configured(): void
    {
        $this->assertNull($this->telegram->getDefaultChatId());
    }

    // -------------------------------------------------------------------------
    // Account-specific config
    // -------------------------------------------------------------------------

    public function test_account_settings_do_not_store_or_override_env_token(): void
    {
        config(['telegram.bot_token' => 'env-token-only']);

        $account = $this->defaultAccount();
        $this->accountConfig(['chat_id' => '-100chat']);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);

        $this->telegram->sendMessageForAccount($account, 'Hello', '-100chat');

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'env-token-only');
        });
        $this->assertNull(
            TelegramNotificationSetting::query()->where('account_id', $account->id)->first()?->bot_token_encrypted,
        );
    }

    public function test_env_token_used_when_account_config_token_missing(): void
    {
        config(['telegram.bot_token' => 'env-only-token']);

        $account = $this->defaultAccount();
        $this->accountConfig(['bot_token_encrypted' => null, 'chat_id' => '-100chat', 'enabled' => true]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);

        $this->telegram->sendMessageForAccount($account, 'Hello', '-100chat');

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'env-only-token');
        });
    }

    public function test_disabled_account_config_returns_skipped_without_api_call(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $account = $this->defaultAccount();
        $this->accountConfig(['enabled' => false, 'chat_id' => '-100chat']);

        Http::fake();

        $result = $this->telegram->sendMessageForAccount($account, 'Hello', '-100chat');

        $this->assertFalse($result['success']);
        $this->assertSame('skipped', $result['error']);
        Http::assertNothingSent();
    }

    public function test_token_source_for_account_returns_env_when_env_token_set(): void
    {
        config(['telegram.bot_token' => 'env-token']);

        $account = $this->defaultAccount();
        $this->accountConfig(['chat_id' => '-100chat']);

        $this->assertSame('env', $this->telegram->tokenSource());
    }

    // -------------------------------------------------------------------------
    // Notification journal logging
    // -------------------------------------------------------------------------

    public function test_successful_send_creates_sent_log(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $this->accountConfig(['chat_id' => '-100log', 'enabled' => true]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 42]], 200)]);

        $this->telegram->sendMessage('Hello log', '-100log');

        $this->assertDatabaseHas('telegram_notification_logs', [
            'status' => TelegramNotificationLog::STATUS_SENT,
            'telegram_chat_id' => '-100log',
            'telegram_message_id' => '42',
        ]);
    }

    public function test_failed_send_creates_failed_log(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $this->accountConfig(['chat_id' => '-100log', 'enabled' => true]);

        Http::fake(['*' => Http::response(['ok' => false, 'description' => 'Bad Request'], 400)]);

        $this->telegram->sendMessage('Fail log', '-100log');

        $this->assertDatabaseHas('telegram_notification_logs', [
            'status' => TelegramNotificationLog::STATUS_FAILED,
        ]);
    }

    public function test_skipped_send_creates_skipped_log(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $this->accountConfig(['enabled' => false, 'chat_id' => '-100log']);

        Http::fake();

        $this->telegram->sendMessage('Skip log', '-100log');

        $this->assertDatabaseHas('telegram_notification_logs', [
            'status' => TelegramNotificationLog::STATUS_SKIPPED,
        ]);
        Http::assertNothingSent();
    }

    public function test_missing_token_creates_failed_log(): void
    {
        $this->accountConfig(['chat_id' => '-100log', 'enabled' => true]);

        $this->telegram->sendMessage('No token', '-100log');

        $this->assertDatabaseHas('telegram_notification_logs', [
            'status' => TelegramNotificationLog::STATUS_FAILED,
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function defaultAccount(): Account
    {
        return Account::query()->firstOrCreate(
            ['slug' => Account::DEFAULT_SLUG],
            ['name' => 'Admin Demo Account', 'is_active' => true],
        );
    }

    private function accountConfig(array $attributes = []): TelegramNotificationSetting
    {
        unset($attributes['bot_token_encrypted']);

        return TelegramNotificationSetting::query()->updateOrCreate(
            ['account_id' => $this->defaultAccount()->id],
            array_merge([
                'enabled' => true,
                'notifications_enabled' => true,
            ], $attributes),
        );
    }

    private function makeShipment(array $attributes = []): Shipment
    {
        $client  = Client::factory()->create();
        $manager = Manager::factory()->create();

        return Shipment::factory()->create(array_merge([
            'client_id'  => $client->id,
            'manager_id' => $manager->id,
        ], $attributes));
    }

    private function makeCheckpoint(Shipment $shipment, array $attributes = []): Checkpoint
    {
        return Checkpoint::factory()->create(array_merge([
            'shipment_id' => $shipment->id,
        ], $attributes));
    }
}
