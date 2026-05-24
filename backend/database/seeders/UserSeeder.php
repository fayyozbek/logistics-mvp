<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Account;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public const DEMO_PASSWORD = 'password';

    /**
     * Local/demo users — password is {@see self::DEMO_PASSWORD} (documented in backend README).
     */
    public function run(): void
    {
        $account = Account::query()->firstOrCreate(
            ['slug' => Account::DEFAULT_SLUG],
            [
                'name' => 'Default Demo Account',
                'is_active' => true,
            ],
        );

        $users = [
            ['email' => 'admin@example.com', 'name' => 'Demo Admin', 'role' => UserRole::Admin],
            ['email' => 'manager@example.com', 'name' => 'Demo Manager', 'role' => UserRole::Manager],
            ['email' => 'operator@example.com', 'name' => 'Demo Operator', 'role' => UserRole::Operator],
            ['email' => 'finance@example.com', 'name' => 'Demo Finance', 'role' => UserRole::Finance],
            ['email' => 'viewer@example.com', 'name' => 'Demo Viewer', 'role' => UserRole::Viewer],
        ];

        foreach ($users as $row) {
            User::query()->updateOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['name'],
                    'password' => Hash::make(self::DEMO_PASSWORD),
                    'role' => $row['role'],
                    'is_active' => true,
                    'account_id' => $account->id,
                ],
            );
        }
    }
}
