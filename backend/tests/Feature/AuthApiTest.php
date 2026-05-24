<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_login_success_returns_token_and_user_without_password(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@example.com',
            'password' => UserSeeder::DEMO_PASSWORD,
        ])
            ->assertOk()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email', 'role'],
            ])
            ->assertJsonPath('user.email', 'admin@example.com')
            ->assertJsonPath('user.role', 'admin');

        $this->assertNotEmpty($response->json('token'));
        $this->assertArrayNotHasKey('password', $response->json('user'));
    }

    public function test_login_invalid_credentials_returns_validation_error(): void
    {
        $this->postJson('/api/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'Неверный email или пароль');
    }

    public function test_login_unknown_email_returns_same_credentials_message(): void
    {
        $this->postJson('/api/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'Неверный email или пароль');
    }

    public function test_inactive_user_cannot_login(): void
    {
        User::query()->where('email', 'admin@example.com')->update(['is_active' => false]);

        $this->postJson('/api/auth/login', [
            'email' => 'admin@example.com',
            'password' => UserSeeder::DEMO_PASSWORD,
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Account is disabled.');
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_me_returns_current_user_safely(): void
    {
        $this->actingAsAdmin();

        $response = $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@example.com')
            ->assertJsonPath('user.role', 'admin');

        $this->assertArrayNotHasKey('password', $response->json('user'));
    }

    public function test_logout_revokes_token(): void
    {
        $login = $this->postJson('/api/auth/login', [
            'email' => 'admin@example.com',
            'password' => UserSeeder::DEMO_PASSWORD,
        ])->assertOk();

        $token = $login->json('token');

        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logged out.');

        $this->app['auth']->forgetGuards();

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }

    public function test_protected_endpoint_rejects_unauthenticated_user(): void
    {
        $this->deleteJson('/api/shipments/1')->assertUnauthorized();
    }

    public function test_role_field_returned_safely_for_each_demo_user(): void
    {
        $expected = [
            'admin@example.com' => 'admin',
            'manager@example.com' => 'manager',
            'operator@example.com' => 'operator',
            'finance@example.com' => 'finance',
            'viewer@example.com' => 'viewer',
        ];

        foreach ($expected as $email => $role) {
            $response = $this->postJson('/api/auth/login', [
                'email' => $email,
                'password' => UserSeeder::DEMO_PASSWORD,
            ])->assertOk();

            $this->assertSame($role, $response->json('user.role'));
            $this->assertArrayNotHasKey('password', $response->json('user'));
        }
    }

    public function test_finance_user_cannot_delete_shipment(): void
    {
        Sanctum::actingAs(User::query()->where('email', 'finance@example.com')->firstOrFail());

        $this->deleteJson('/api/shipments/1')
            ->assertForbidden()
            ->assertJson(['message' => 'This action is unauthorized.']);
    }

    public function test_viewer_cannot_delete_shipment(): void
    {
        Sanctum::actingAs(User::query()->where('email', 'viewer@example.com')->firstOrFail());

        $this->deleteJson('/api/shipments/1')
            ->assertForbidden()
            ->assertJson(['message' => 'This action is unauthorized.']);
    }
}
