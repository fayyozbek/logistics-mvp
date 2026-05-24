<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Account;
use App\Models\TelegramNotificationLog;
use App\Models\TelegramNotificationSetting;
use App\Models\User;
use App\Services\TelegramBotService;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TelegramAuthScopingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['telegram.bot_token' => 'scope-test-token', 'telegram.default_chat_id' => null]);
        $this->seed(UserSeeder::class);
    }

    public function test_user_a_settings_not_visible_to_user_b_on_different_accounts(): void
    {
        [$userA, $userB] = $this->twoAccountAdmins();

        Sanctum::actingAs($userA);
        $this->patchJson('/api/telegram/settings', [
            'telegramChatId' => '-100-user-a-chat',
            'enabled' => true,
        ])->assertOk()
            ->assertJsonPath('settings.telegramChatId', '-100-user-a-chat');

        Sanctum::actingAs($userB);
        $response = $this->getJson('/api/telegram/settings')->assertOk();

        $chatId = $response->json('settings.telegramChatId');
        $this->assertNotSame('-100-user-a-chat', $chatId);
    }

    public function test_user_a_journal_logs_not_visible_to_user_b(): void
    {
        [$userA, $userB] = $this->twoAccountAdmins();

        TelegramNotificationSetting::query()->updateOrCreate(
            ['account_id' => $userA->account_id],
            [
                'telegram_chat_id' => '-100-a',
                'enabled' => true,
                'notifications_enabled' => true,
            ],
        );

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);

        Sanctum::actingAs($userA);
        $this->postJson('/api/telegram/test-message', ['chatId' => '-100-a'])->assertOk();

        $this->getJson('/api/telegram/notifications')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        Sanctum::actingAs($userB);
        $this->getJson('/api/telegram/notifications')
            ->assertOk()
            ->assertJsonPath('meta.total', 0)
            ->assertJsonCount(0, 'notifications');
    }

    public function test_notification_uses_current_user_account_chat_id(): void
    {
        [$userA] = $this->twoAccountAdmins();

        TelegramNotificationSetting::query()->updateOrCreate(
            ['account_id' => $userA->account_id],
            [
                'telegram_chat_id' => '-100-scoped-chat',
                'enabled' => true,
                'notifications_enabled' => true,
            ],
        );

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 42]], 200)]);

        Sanctum::actingAs($userA);
        app(TelegramBotService::class)->sendTestMessage();

        Http::assertSent(function ($request) {
            return ($request->data()['chat_id'] ?? null) === '-100-scoped-chat';
        });

        $this->assertDatabaseHas('telegram_notification_logs', [
            'account_id' => $userA->account_id,
            'user_id' => $userA->id,
            'telegram_chat_id' => '-100-scoped-chat',
            'status' => TelegramNotificationLog::STATUS_SENT,
        ]);
    }

    public function test_user_scoped_settings_when_no_account_id(): void
    {
        $userA = User::factory()->create([
            'role' => UserRole::Admin,
            'account_id' => null,
            'is_active' => true,
        ]);
        $userB = User::factory()->create([
            'role' => UserRole::Admin,
            'account_id' => null,
            'is_active' => true,
        ]);

        Sanctum::actingAs($userA);
        $this->patchJson('/api/telegram/settings', [
            'telegramChatId' => '-100-personal-a',
            'enabled' => true,
        ])->assertOk();

        Sanctum::actingAs($userB);
        $this->getJson('/api/telegram/settings')
            ->assertOk()
            ->assertJsonPath('settings.telegramChatId', null);

        $this->assertDatabaseHas('telegram_notification_settings', [
            'user_id' => $userA->id,
            'account_id' => null,
            'telegram_chat_id' => '-100-personal-a',
        ]);
    }

    public function test_settings_response_never_exposes_bot_token(): void
    {
        config(['telegram.bot_token' => 'super-secret-scope-token']);
        [$userA] = $this->twoAccountAdmins();

        Sanctum::actingAs($userA);
        $response = $this->getJson('/api/telegram/settings')->assertOk();

        $this->assertStringNotContainsString('super-secret-scope-token', $response->content());
        $this->assertArrayNotHasKey('botToken', $response->json('settings') ?? []);
    }

    /**
     * @return array{0: User, 1: User}
     */
    private function twoAccountAdmins(): array
    {
        $accountA = Account::query()->create([
            'slug' => 'tenant-a',
            'name' => 'Tenant A',
            'is_active' => true,
        ]);
        $accountB = Account::query()->create([
            'slug' => 'tenant-b',
            'name' => 'Tenant B',
            'is_active' => true,
        ]);

        $userA = User::factory()->create([
            'role' => UserRole::Admin,
            'account_id' => $accountA->id,
            'is_active' => true,
        ]);
        $userB = User::factory()->create([
            'role' => UserRole::Admin,
            'account_id' => $accountB->id,
            'is_active' => true,
        ]);

        return [$userA, $userB];
    }
}
