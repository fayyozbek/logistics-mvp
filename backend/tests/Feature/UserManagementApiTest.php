<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Account;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class UserManagementApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_admin_can_list_users(): void
    {
        $this->actingAsAdmin();

        $response = $this->getJson('/api/users')
            ->assertOk()
            ->assertJsonStructure([
                'users' => [
                    '*' => ['id', 'name', 'email', 'role', 'isActive', 'accountId'],
                ],
                'meta' => ['total', 'limit', 'returned'],
            ]);

        $this->assertGreaterThanOrEqual(5, count($response->json('users')));

        foreach ($response->json('users') as $user) {
            $this->assertArrayNotHasKey('password', $user);
            $this->assertArrayNotHasKey('token', $user);
        }
    }

    public function test_non_admin_cannot_list_users(): void
    {
        $this->actingAsManager();

        $this->getJson('/api/users')
            ->assertForbidden()
            ->assertJson(['message' => 'This action is unauthorized.']);
    }

    public function test_admin_can_create_user(): void
    {
        $this->actingAsAdmin();

        $account = Account::query()->firstOrFail();

        $response = $this->postJson('/api/users', [
            'name' => 'QA Created User',
            'email' => 'qa.created.user@example.com',
            'password' => 'secure-pass-1',
            'role' => 'viewer',
            'accountId' => $account->id,
            'isActive' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('user.email', 'qa.created.user@example.com')
            ->assertJsonPath('user.role', 'viewer')
            ->assertJsonPath('user.isActive', true);

        $this->assertDatabaseHas('users', [
            'email' => 'qa.created.user@example.com',
            'role' => 'viewer',
            'is_active' => true,
        ]);

        $created = User::query()->where('email', 'qa.created.user@example.com')->firstOrFail();
        $this->assertNotSame('', (string) $created->password);
        $this->assertNotSame('secure-pass-1', (string) $created->password);
    }

    public function test_created_user_can_login(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/users', [
            'name' => 'Login Test User',
            'email' => 'login.test.user@example.com',
            'password' => 'login-pass-99',
            'role' => 'operator',
        ])->assertCreated();

        $this->app['auth']->forgetGuards();

        $this->postJson('/api/auth/login', [
            'email' => 'login.test.user@example.com',
            'password' => 'login-pass-99',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'login.test.user@example.com')
            ->assertJsonPath('user.role', 'operator');
    }

    public function test_admin_can_update_user_role_name_and_email(): void
    {
        $this->actingAsAdmin();

        $user = User::query()->create([
            'name' => 'Patch Target',
            'email' => 'patch.target@example.com',
            'password' => 'initial-pass-1',
            'role' => UserRole::Viewer,
            'is_active' => true,
        ]);

        $this->patchJson("/api/users/{$user->id}", [
            'name' => 'Patched User',
            'email' => 'patched.user@example.com',
            'role' => 'finance',
        ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Patched User')
            ->assertJsonPath('user.email', 'patched.user@example.com')
            ->assertJsonPath('user.role', 'finance');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Patched User',
            'email' => 'patched.user@example.com',
            'role' => 'finance',
        ]);
    }

    public function test_admin_can_deactivate_user_via_delete(): void
    {
        $this->actingAsAdmin();

        $user = User::query()->create([
            'name' => 'Deactivate Me',
            'email' => 'deactivate.me@example.com',
            'password' => 'deactivate-pass',
            'role' => UserRole::Viewer,
            'is_active' => true,
        ]);

        $this->deleteJson("/api/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('message', 'User deactivated.')
            ->assertJsonPath('user.isActive', false);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'is_active' => false,
        ]);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/users', [
            'name' => 'Inactive Soon',
            'email' => 'inactive.soon@example.com',
            'password' => 'inactive-pass-1',
            'role' => 'viewer',
        ])->assertCreated();

        $user = User::query()->where('email', 'inactive.soon@example.com')->firstOrFail();

        $this->deleteJson("/api/users/{$user->id}")->assertOk();

        $this->app['auth']->forgetGuards();

        $this->postJson('/api/auth/login', [
            'email' => 'inactive.soon@example.com',
            'password' => 'inactive-pass-1',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Account is disabled.');
    }

    public function test_admin_cannot_deactivate_self(): void
    {
        $admin = $this->actingAsAdmin();

        $this->deleteJson("/api/users/{$admin->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user']);

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'is_active' => true,
        ]);
    }

    public function test_admin_cannot_deactivate_last_active_admin(): void
    {
        $admin = $this->actingAsAdmin();

        User::query()
            ->where('role', UserRole::Admin)
            ->where('id', '!=', $admin->id)
            ->update(['is_active' => false]);

        $this->patchJson("/api/users/{$admin->id}", [
            'isActive' => false,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user']);

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'is_active' => true,
        ]);
    }

    public function test_user_list_never_exposes_password_hash(): void
    {
        $this->actingAsAdmin();

        $response = $this->getJson('/api/users')->assertOk();

        $raw = $response->getContent();
        $this->assertStringNotContainsString('$2y$', $raw);
        $this->assertStringNotContainsString('password', strtolower($raw));
    }

    public function test_create_user_validation_returns_422_json(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/users', [
            'email' => 'not-an-email',
            'role' => 'invalid-role',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password', 'role']);
    }

    public function test_show_user_returns_404_when_missing(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/users/99999')->assertNotFound();
    }
}
