<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\User;
use Database\Seeders\Support\DemoAccounts;
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
        foreach (DemoAccounts::all() as $row) {
            $account = Account::query()->updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'name' => $row['name'],
                    'is_active' => true,
                ],
            );

            User::query()->updateOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['user_name'],
                    'password' => Hash::make(self::DEMO_PASSWORD),
                    'role' => $row['role'],
                    'is_active' => true,
                    'account_id' => $account->id,
                ],
            );
        }
    }
}
