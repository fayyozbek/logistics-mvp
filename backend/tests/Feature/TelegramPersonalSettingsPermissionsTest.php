<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Account;
use App\Models\TelegramNotificationLog;
use App\Models\TelegramNotificationSetting;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class TelegramPersonalSettingsPermissionsTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['telegram.bot_token' => 'personal-settings-token', 'telegram.default_chat_id' => null]);
        $this->seed(UserSeeder::class);
    }

    /**
     * @return array<string, array{0: UserRole}>
     */
    public static function allAuthenticatedRolesProvider(): array
    {
        return [
            'admin' => [UserRole::Admin],
            'manager' => [UserRole::Manager],
            'operator' => [UserRole::Operator],
            'finance' => [UserRole::Finance],
            'viewer' => [UserRole::Viewer],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('allAuthenticatedRolesProvider')]
    public function test_role_can_get_and_patch_own_telegram_settings(UserRole $role): void
    {
        $user = $this->actingAsRole($role);
        $chatSuffix = strtolower($role->value);

        $this->getJson('/api/telegram/settings')->assertOk();

        $this->patchJson('/api/telegram/settings', [
            'telegramChatId' => "-100-{$chatSuffix}-personal",
            'enabled' => true,
            'notificationsEnabled' => true,
            'notifyShipmentCreated' => true,
        ])
            ->assertOk()
            ->assertJsonPath('settings.telegramChatId', "-100-{$chatSuffix}-personal");

        $scope = $user->account_id !== null
            ? ['account_id' => $user->account_id]
            : ['user_id' => $user->id, 'account_id' => null];

        $this->assertDatabaseHas('telegram_notification_settings', array_merge($scope, [
            'telegram_chat_id' => "-100-{$chatSuffix}-personal",
            'enabled' => true,
        ]));
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('allAuthenticatedRolesProvider')]
    public function test_role_can_read_own_notification_journal(UserRole $role): void
    {
        $user = $this->actingAsRole($role);

        TelegramNotificationSetting::query()->updateOrCreate(
            $user->account_id !== null
                ? ['account_id' => $user->account_id]
                : ['user_id' => $user->id, 'account_id' => null],
            [
                'telegram_chat_id' => "-100-{$role->value}-journal",
                'enabled' => true,
                'notifications_enabled' => true,
            ],
        );

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 99]], 200)]);

        $this->postJson('/api/telegram/test-message')->assertOk();

        $this->getJson('/api/telegram/notifications')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }

    public function test_patch_with_bot_token_returns_422(): void
    {
        $this->actingAsManager();

        $this->patchJson('/api/telegram/settings', [
            'botToken' => 'must-not-save',
            'telegramChatId' => '-100-manager-safe',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['botToken']);
    }

    public function test_settings_response_never_exposes_bot_token(): void
    {
        config(['telegram.bot_token' => 'never-expose-this-token']);
        $this->actingAsFinance();

        $response = $this->getJson('/api/telegram/settings')->assertOk();

        $this->assertStringNotContainsString('never-expose-this-token', $response->content());
        $this->assertArrayNotHasKey('botToken', $response->json('settings') ?? []);
    }

    public function test_manager_settings_do_not_leak_to_operator(): void
    {
        $manager = $this->actingAsManager();
        $this->patchJson('/api/telegram/settings', [
            'telegramChatId' => '-100-manager-only',
            'enabled' => true,
        ])->assertOk();

        $operator = User::query()->where('email', 'operator@example.com')->firstOrFail();
        Sanctum::actingAs($operator);

        $chatId = $this->getJson('/api/telegram/settings')
            ->assertOk()
            ->json('settings.telegramChatId');

        $this->assertNotSame('-100-manager-only', $chatId);
        $this->assertNotEquals($manager->account_id, $operator->account_id);
    }

    public function test_test_message_uses_current_user_chat_id(): void
    {
        $user = $this->actingAsOperator();

        TelegramNotificationSetting::query()->updateOrCreate(
            $user->account_id !== null
                ? ['account_id' => $user->account_id]
                : ['user_id' => $user->id, 'account_id' => null],
            [
                'telegram_chat_id' => '-100-operator-test',
                'enabled' => true,
                'notifications_enabled' => true,
            ],
        );

        Http::fake(['*' => Http::response(['ok' => true, 'result' => ['message_id' => 7]], 200)]);

        $this->postJson('/api/telegram/test-message')->assertOk();

        Http::assertSent(function ($request) {
            return ($request->data()['chat_id'] ?? null) === '-100-operator-test';
        });

        $this->assertDatabaseHas('telegram_notification_logs', [
            'user_id' => $user->id,
            'telegram_chat_id' => '-100-operator-test',
            'status' => TelegramNotificationLog::STATUS_SENT,
        ]);
    }

    public function test_viewer_can_access_telegram_status(): void
    {
        $this->actingAsViewer();

        $this->getJson('/api/telegram/status')
            ->assertOk()
            ->assertJsonStructure(['configured', 'enabled', 'hasChatId', 'notificationsEnabled']);
    }

    public function test_user_scoped_settings_isolated_between_viewer_and_finance(): void
    {
        $account = Account::query()->create([
            'slug' => 'shared-tenant',
            'name' => 'Shared',
            'is_active' => true,
        ]);

        $viewer = User::factory()->create([
            'role' => UserRole::Viewer,
            'account_id' => null,
            'is_active' => true,
        ]);
        $finance = User::factory()->create([
            'role' => UserRole::Finance,
            'account_id' => null,
            'is_active' => true,
        ]);

        Sanctum::actingAs($viewer);
        $this->patchJson('/api/telegram/settings', [
            'telegramChatId' => '-100-viewer-scoped',
            'enabled' => true,
        ])->assertOk();

        Sanctum::actingAs($finance);
        $this->patchJson('/api/telegram/settings', [
            'telegramChatId' => '-100-finance-scoped',
            'enabled' => true,
        ])->assertOk();

        $this->getJson('/api/telegram/settings')
            ->assertOk()
            ->assertJsonPath('settings.telegramChatId', '-100-finance-scoped');

        $this->assertDatabaseHas('telegram_notification_settings', [
            'user_id' => $viewer->id,
            'telegram_chat_id' => '-100-viewer-scoped',
        ]);
        $this->assertDatabaseHas('telegram_notification_settings', [
            'user_id' => $finance->id,
            'telegram_chat_id' => '-100-finance-scoped',
        ]);
    }
}
