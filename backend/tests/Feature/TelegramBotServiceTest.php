<?php

namespace Tests\Feature;

use App\Models\Checkpoint;
use App\Models\Client;
use App\Models\Manager;
use App\Models\Shipment;
use App\Models\TelegramSetting;
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

    public function test_service_reports_configured_when_db_token_exists(): void
    {
        TelegramSetting::create([
            'bot_token' => 'db-token-xyz',
            'chat_id'   => '-100000',
            'connected' => true,
        ]);

        $this->assertTrue($this->telegram->isConfigured());
    }

    // -------------------------------------------------------------------------
    // sendMessage() – failure paths
    // -------------------------------------------------------------------------

    public function test_send_message_returns_failure_when_token_missing(): void
    {
        $result = $this->telegram->sendMessage('-100chat', 'Hello');

        $this->assertFalse($result['success']);
        $this->assertSame('missing_token', $result['error']);
        $this->assertNull($result['telegram_message_id']);
    }

    public function test_send_message_returns_failure_when_chat_id_empty(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $result = $this->telegram->sendMessage('', 'Hello');

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

        $result = $this->telegram->sendMessage('-100chat', 'Hello');

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

        $result = $this->telegram->sendMessage('-100chat', 'Hello');

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

        $this->telegram->sendMessage('-100testchat', 'Test message body');

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

        $result = $this->telegram->sendMessage('-100chat', 'Hello');

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

        $result = $this->telegram->sendTestMessage('-100testchat');

        $this->assertTrue($result['success']);
        $this->assertSame(7, $result['telegram_message_id']);
    }

    public function test_send_test_message_uses_db_chat_id_when_not_overridden(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        TelegramSetting::create([
            'chat_id'   => '-100dbchat',
            'connected' => true,
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

    public function test_get_default_chat_id_returns_db_value(): void
    {
        TelegramSetting::create(['chat_id' => '-100fromdb', 'connected' => true]);

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
    // Helpers
    // -------------------------------------------------------------------------

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
