<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Checkpoint;
use App\Models\Client;
use App\Models\Manager;
use App\Models\Shipment;
use App\Models\TelegramNotificationSetting;
use App\Models\TelegramNotificationLog;
use App\Services\TelegramBotService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class TelegramNotificationJournalTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    private TelegramBotService $telegram;

    protected function setUp(): void
    {
        parent::setUp();

        config(['telegram.bot_token' => null, 'telegram.default_chat_id' => null]);

        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        $this->telegram = app(TelegramBotService::class);
        $this->actingAsAdmin();
    }

    public function test_successful_send_creates_sent_log(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $account = $this->defaultAccount();
        $this->accountConfig([
            'telegram_chat_id' => '-100chat',
            'enabled' => true,
        ]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 99]], 200)]);

        $this->telegram->sendTestMessage();

        $this->assertDatabaseHas('telegram_notification_logs', [
            'account_id' => $account->id,
            'event_type' => TelegramNotificationLog::EVENT_TEST_MESSAGE,
            'status' => TelegramNotificationLog::STATUS_SENT,
            'telegram_chat_id' => '-100chat',
            'telegram_message_id' => '99',
        ]);

        $log = TelegramNotificationLog::query()->first();
        $this->assertNotNull($log->sent_at);
        $this->assertNull($log->error_message);
        $this->assertLessThanOrEqual(200, mb_strlen($log->message_preview ?? ''));
    }

    public function test_telegram_api_failure_creates_failed_log(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $account = $this->defaultAccount();
        $this->accountConfig([
            'telegram_chat_id' => '-100chat',
            'enabled' => true,
        ]);

        Http::fake([
            '*' => Http::response(['ok' => false, 'description' => 'Bad Request'], 400),
        ]);

        $this->telegram->sendTestMessage();

        $this->assertDatabaseHas('telegram_notification_logs', [
            'account_id' => $account->id,
            'status' => TelegramNotificationLog::STATUS_FAILED,
        ]);

        $log = TelegramNotificationLog::query()->first();
        $this->assertNull($log->sent_at);
        $this->assertNotNull($log->error_message);
        $this->assertStringNotContainsString('test-token', $log->error_message ?? '');
    }

    public function test_disabled_config_creates_skipped_log(): void
    {
        $account = $this->defaultAccount();
        $this->accountConfig([
            'bot_token_encrypted' => 'test-token',
            'telegram_chat_id' => '-100chat',
            'enabled' => false,
        ]);

        Http::fake();

        $this->telegram->sendTestMessage();

        $this->assertDatabaseHas('telegram_notification_logs', [
            'account_id' => $account->id,
            'status' => TelegramNotificationLog::STATUS_SKIPPED,
        ]);

        Http::assertNothingSent();
    }

    public function test_shipment_created_notification_logs_related_shipment(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $account = $this->defaultAccount();
        $this->accountConfig([
            'telegram_chat_id' => '-100chat',
            'enabled' => true,
        ]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);

        $shipment = $this->makeShipment(['tracking_number' => 'LGX-JOURNAL-001']);

        $this->telegram->sendShipmentCreatedNotification($shipment, $account);

        $this->assertDatabaseHas('telegram_notification_logs', [
            'event_type' => TelegramNotificationLog::EVENT_SHIPMENT_CREATED,
            'related_type' => 'shipment',
            'related_id' => $shipment->id,
            'status' => TelegramNotificationLog::STATUS_SENT,
        ]);
    }

    public function test_get_notifications_returns_journal_for_current_account(): void
    {
        $account = $this->defaultAccount();
        $config = $this->accountConfig(['enabled' => true]);

        TelegramNotificationLog::query()->create([
            'account_id' => $account->id,
            'telegram_notification_setting_id' => $config->id,
            'event_type' => TelegramNotificationLog::EVENT_TEST_MESSAGE,
            'status' => TelegramNotificationLog::STATUS_SENT,
            'telegram_chat_id' => '-100chat',
            'message_preview' => 'Preview text',
            'sent_at' => now(),
        ]);

        $otherAccount = Account::query()->create([
            'name' => 'Other',
            'slug' => 'other-account',
            'is_active' => true,
        ]);
        TelegramNotificationLog::query()->create([
            'account_id' => $otherAccount->id,
            'event_type' => TelegramNotificationLog::EVENT_TEST_MESSAGE,
            'status' => TelegramNotificationLog::STATUS_FAILED,
            'message_preview' => 'Other',
        ]);

        $response = $this->getJson('/api/telegram/notifications')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonCount(1, 'notifications');

        $this->assertSame('test_message', $response->json('notifications.0.eventType'));
        $this->assertSame('sent', $response->json('notifications.0.status'));
        $this->assertStringNotContainsString('token', strtolower($response->content()));
    }

    public function test_get_notifications_filters_by_status_and_event_type(): void
    {
        $account = $this->defaultAccount();

        TelegramNotificationLog::query()->create([
            'account_id' => $account->id,
            'event_type' => TelegramNotificationLog::EVENT_TEST_MESSAGE,
            'status' => TelegramNotificationLog::STATUS_SENT,
            'message_preview' => 'A',
        ]);
        TelegramNotificationLog::query()->create([
            'account_id' => $account->id,
            'event_type' => TelegramNotificationLog::EVENT_SHIPMENT_CREATED,
            'status' => TelegramNotificationLog::STATUS_FAILED,
            'message_preview' => 'B',
        ]);

        $this->getJson('/api/telegram/notifications?status=failed&event_type=shipment_created')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('notifications.0.eventType', 'shipment_created')
            ->assertJsonPath('notifications.0.status', 'failed');
    }

    public function test_api_test_message_creates_journal_entry(): void
    {
        config(['telegram.bot_token' => 'test-token']);

        $this->accountConfig([
            'telegram_chat_id' => '-100chat',
            'enabled' => true,
        ]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 5]], 200)]);

        $this->postJson('/api/telegram/test-message', ['chatId' => '-100chat'])
            ->assertOk();

        $this->assertDatabaseCount('telegram_notification_logs', 1);
        $this->getJson('/api/telegram/notifications')
            ->assertOk()
            ->assertJsonPath('notifications.0.status', 'sent');
    }

    public function test_network_error_creates_failed_log_without_token_in_error(): void
    {
        config(['telegram.bot_token' => 'leak-test-token']);

        $account = $this->defaultAccount();
        $this->accountConfig([
            'telegram_chat_id' => '-100chat',
            'enabled' => true,
        ]);

        Http::fake(function () {
            throw new ConnectionException('timeout');
        });

        $this->telegram->sendTestMessage();

        $log = TelegramNotificationLog::query()->firstOrFail();
        $this->assertSame(TelegramNotificationLog::STATUS_FAILED, $log->status);
        $this->assertStringNotContainsString('leak-test-token', $log->error_message ?? '');
        $this->assertStringNotContainsString('leak-test-token', $log->message_preview ?? '');
    }

    private function defaultAccount(): Account
    {
        return Account::query()->firstOrCreate(
            ['slug' => Account::DEFAULT_SLUG],
            ['name' => 'Default Demo Account', 'is_active' => true],
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
        $client = Client::factory()->create();
        $manager = Manager::factory()->create();

        return Shipment::factory()->create(array_merge([
            'client_id' => $client->id,
            'manager_id' => $manager->id,
        ], $attributes));
    }
}
