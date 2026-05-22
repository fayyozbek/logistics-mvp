<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Client;
use App\Models\Manager;
use App\Models\Shipment;
use App\Models\TelegramBotConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Verifies that Telegram notifications are dispatched on logistics events and
 * that failures in the Telegram layer never break the primary API response.
 */
class TelegramEventNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private int $clientId;
    private int $managerId;

    protected function setUp(): void
    {
        parent::setUp();

        config(['telegram.bot_token' => null, 'telegram.default_chat_id' => null]);

        $this->clientId  = Client::factory()->create()->id;
        $this->managerId = Manager::factory()->create()->id;
    }

    // =========================================================================
    // Helper
    // =========================================================================

    /**
     * Enable Telegram for the default demo account via telegram_bot_configs.
     */
    private function enableTelegram(array $overrides = []): TelegramBotConfig
    {
        $account = Account::query()->firstOrCreate(
            ['slug' => Account::DEFAULT_SLUG],
            ['name' => 'Default Demo Account', 'is_active' => true],
        );

        if (isset($overrides['connected'])) {
            $overrides['enabled'] = (bool) $overrides['connected'];
            unset($overrides['connected']);
        }

        if (isset($overrides['event_flags'])) {
            $flags = $overrides['event_flags'];
            unset($overrides['event_flags']);

            if (array_key_exists('departure', $flags)) {
                $overrides['notify_shipment_created'] = (bool) $flags['departure'];
            }
            if (array_key_exists('checkpoint', $flags)) {
                $overrides['notify_checkpoint_added'] = (bool) $flags['checkpoint'];
            }

            $overrides['notify_status_changed'] = (bool) (
                ($flags['delivery'] ?? false)
                || ($flags['delay'] ?? false)
                || ($flags['departure'] ?? false)
                || ($flags['checkpoint'] ?? false)
            );
        }

        return TelegramBotConfig::query()->updateOrCreate(
            ['account_id' => $account->id],
            array_merge([
                'chat_id' => '-100testchat',
                'enabled' => true,
                'notifications_enabled' => true,
                'notify_shipment_created' => true,
                'notify_status_changed' => true,
                'notify_checkpoint_added' => true,
                'bot_token_encrypted' => 'test-token',
            ], $overrides),
        );
    }

    /** Minimal payload to POST /api/shipments. */
    private function shipmentPayload(array $overrides = []): array
    {
        return array_merge([
            'clientId'              => $this->clientId,
            'managerId'             => $this->managerId,
            'type'                  => 'auto',
            'origin'                => 'Алматы',
            'destination'           => 'Ташкент',
            'cargo'                 => 'Электроника',
            'telegramNotifications' => true,
        ], $overrides);
    }

    // =========================================================================
    // Shipment created
    // =========================================================================

    public function test_shipment_creation_triggers_telegram_when_enabled(): void
    {
        $this->enableTelegram();

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);

        $this->postJson('/api/shipments', $this->shipmentPayload())
            ->assertCreated();

        Http::assertSentCount(1);
        Http::assertSent(function ($request) {
            $text = $request->data()['text'] ?? '';

            return str_contains($request->url(), '/sendMessage')
                && str_contains($text, 'Алматы')
                && str_contains($text, 'Ташкент');
        });
    }

    public function test_shipment_creation_does_not_notify_when_per_shipment_flag_off(): void
    {
        $this->enableTelegram();

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);

        $this->postJson('/api/shipments', $this->shipmentPayload([
            'telegramNotifications' => false,
        ]))->assertCreated();

        Http::assertNothingSent();
    }

    public function test_shipment_creation_does_not_notify_when_settings_disconnected(): void
    {
        $this->enableTelegram(['connected' => false]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);

        $this->postJson('/api/shipments', $this->shipmentPayload())
            ->assertCreated();

        Http::assertNothingSent();
    }

    public function test_shipment_creation_does_not_notify_when_departure_flag_off(): void
    {
        $this->enableTelegram([
            'notify_shipment_created' => false,
            'notify_status_changed' => false,
            'notify_checkpoint_added' => true,
        ]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);

        $this->postJson('/api/shipments', $this->shipmentPayload())
            ->assertCreated();

        Http::assertNothingSent();
    }

    public function test_shipment_creation_succeeds_when_token_missing(): void
    {
        // No token set, no Telegram settings — notification skipped silently.
        $this->postJson('/api/shipments', $this->shipmentPayload())
            ->assertCreated();
    }

    public function test_shipment_creation_succeeds_when_telegram_api_fails(): void
    {
        $this->enableTelegram();

        Http::fake(function () {
            throw new ConnectionException('Connection refused');
        });

        // Telegram failure must not affect the 201 response.
        $this->postJson('/api/shipments', $this->shipmentPayload())
            ->assertCreated();
    }

    public function test_shipment_creation_response_does_not_contain_token(): void
    {
        config(['telegram.bot_token' => 'secret-shipment-token']);

        $this->enableTelegram();

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);

        $response = $this->postJson('/api/shipments', $this->shipmentPayload())
            ->assertCreated();

        $this->assertStringNotContainsString('secret-shipment-token', $response->content());
    }

    // =========================================================================
    // Shipment status changed
    // =========================================================================

    public function test_status_update_triggers_telegram_when_enabled(): void
    {
        $this->enableTelegram();

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 2]], 200)]);

        $shipment = Shipment::factory()->create([
            'client_id'              => $this->clientId,
            'manager_id'             => $this->managerId,
            'status'                 => 'planned',
            'telegram_notifications' => true,
        ]);

        $this->patchJson("/api/shipments/{$shipment->id}/status", [
            'status' => 'in_transit',
        ])->assertOk();

        Http::assertSentCount(1);
        Http::assertSent(function ($request) {
            $text = $request->data()['text'] ?? '';

            return str_contains($request->url(), '/sendMessage')
                && str_contains($text, 'Запланирован')
                && str_contains($text, 'В пути');
        });
    }

    public function test_status_update_to_delivered_uses_delivery_flag(): void
    {
        $this->enableTelegram([
            'event_flags' => ['departure' => false, 'delivery' => true, 'delay' => false, 'checkpoint' => false],
        ]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 3]], 200)]);

        $shipment = Shipment::factory()->create([
            'client_id'              => $this->clientId,
            'status'                 => 'in_transit',
            'telegram_notifications' => true,
        ]);

        $this->patchJson("/api/shipments/{$shipment->id}/status", [
            'status' => 'delivered',
        ])->assertOk();

        Http::assertSentCount(1);
    }

    public function test_status_update_to_delayed_uses_delay_flag(): void
    {
        $this->enableTelegram([
            'event_flags' => ['departure' => false, 'delivery' => false, 'delay' => true, 'checkpoint' => false],
        ]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 4]], 200)]);

        $shipment = Shipment::factory()->create([
            'client_id'              => $this->clientId,
            'status'                 => 'in_transit',
            'telegram_notifications' => true,
        ]);

        $this->patchJson("/api/shipments/{$shipment->id}/status", [
            'status' => 'delayed',
        ])->assertOk();

        Http::assertSentCount(1);
    }

    public function test_status_update_to_planned_sends_no_notification(): void
    {
        $this->enableTelegram();

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 5]], 200)]);

        $shipment = Shipment::factory()->create([
            'client_id'              => $this->clientId,
            'status'                 => 'delayed',
            'telegram_notifications' => true,
        ]);

        $this->patchJson("/api/shipments/{$shipment->id}/status", [
            'status' => 'planned',
        ])->assertOk();

        // 'planned' has no mapped event flag → no notification
        Http::assertNothingSent();
    }

    public function test_status_update_succeeds_when_token_missing(): void
    {
        // No token, no settings → no notification attempted, operation succeeds.
        $shipment = Shipment::factory()->create([
            'client_id' => $this->clientId,
            'status'    => 'planned',
        ]);

        $this->patchJson("/api/shipments/{$shipment->id}/status", [
            'status' => 'in_transit',
        ])->assertOk();
    }

    public function test_status_update_succeeds_when_telegram_api_fails(): void
    {
        $this->enableTelegram();

        Http::fake(['*' => Http::response(['ok' => false, 'description' => 'Bad Request'], 400)]);

        $shipment = Shipment::factory()->create([
            'client_id'              => $this->clientId,
            'status'                 => 'planned',
            'telegram_notifications' => true,
        ]);

        // Telegram failure must not affect the 200 response.
        $this->patchJson("/api/shipments/{$shipment->id}/status", [
            'status' => 'in_transit',
        ])->assertOk();
    }

    // =========================================================================
    // Checkpoint added
    // =========================================================================

    public function test_checkpoint_creation_triggers_telegram_when_enabled(): void
    {
        $this->enableTelegram();

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 6]], 200)]);

        $shipment = Shipment::factory()->create([
            'client_id'              => $this->clientId,
            'telegram_notifications' => true,
        ]);

        $this->postJson("/api/shipments/{$shipment->id}/checkpoints", [
            'city'      => 'Астана',
            'country'   => 'KZ',
            'address'   => 'Терминал Астана-1',
            'plannedAt' => '2026-06-20 10:00',
            'status'    => 'upcoming',
        ])->assertCreated();

        Http::assertSentCount(1);
        Http::assertSent(function ($request) {
            return str_contains($request->data()['text'] ?? '', 'Астана');
        });
    }

    public function test_checkpoint_creation_does_not_notify_when_flag_off(): void
    {
        $this->enableTelegram([
            'notify_checkpoint_added' => false,
            'notify_status_changed' => false,
            'notify_shipment_created' => true,
        ]);

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 7]], 200)]);

        $shipment = Shipment::factory()->create([
            'client_id'              => $this->clientId,
            'telegram_notifications' => true,
        ]);

        $this->postJson("/api/shipments/{$shipment->id}/checkpoints", [
            'city'      => 'Астана',
            'address'   => 'Терминал',
            'plannedAt' => '2026-06-20 10:00',
        ])->assertCreated();

        Http::assertNothingSent();
    }

    public function test_checkpoint_creation_succeeds_when_token_missing(): void
    {
        $shipment = Shipment::factory()->create([
            'client_id'              => $this->clientId,
            'telegram_notifications' => true,
        ]);

        $this->postJson("/api/shipments/{$shipment->id}/checkpoints", [
            'city'      => 'Астана',
            'address'   => 'Терминал',
            'plannedAt' => '2026-06-20 10:00',
        ])->assertCreated();
    }

    public function test_checkpoint_creation_succeeds_when_telegram_network_error(): void
    {
        $this->enableTelegram();

        Http::fake(function () {
            throw new ConnectionException('timeout');
        });

        $shipment = Shipment::factory()->create([
            'client_id'              => $this->clientId,
            'telegram_notifications' => true,
        ]);

        // Network error must not affect the 201 response.
        $this->postJson("/api/shipments/{$shipment->id}/checkpoints", [
            'city'      => 'Астана',
            'address'   => 'Терминал',
            'plannedAt' => '2026-06-20 10:00',
        ])->assertCreated();
    }
}
