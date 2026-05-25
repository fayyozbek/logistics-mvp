<?php

namespace Tests\Concerns;

use App\Enums\UserRole;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

trait AuthenticatesApiUsers
{
    protected function actingAsRole(UserRole $role): User
    {
        $email = match ($role) {
            UserRole::Admin => 'admin@example.com',
            UserRole::Manager => 'manager@example.com',
            UserRole::Operator => 'operator@example.com',
            UserRole::Finance => 'finance@example.com',
            UserRole::Viewer => 'viewer@example.com',
        };

        $user = User::query()->where('email', $email)->firstOrFail();
        Sanctum::actingAs($user);

        return $user;
    }

    protected function actingAsAdmin(): User
    {
        return $this->actingAsRole(UserRole::Admin);
    }

    protected function actingAsManager(): User
    {
        return $this->actingAsRole(UserRole::Manager);
    }

    protected function actingAsOperator(): User
    {
        return $this->actingAsRole(UserRole::Operator);
    }

    protected function actingAsFinance(): User
    {
        return $this->actingAsRole(UserRole::Finance);
    }

    protected function actingAsViewer(): User
    {
        return $this->actingAsRole(UserRole::Viewer);
    }
}
