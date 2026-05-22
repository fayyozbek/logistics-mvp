<?php

namespace App\Services;

use App\Models\Account;

/**
 * Resolves the active account for the current request.
 *
 * MVP: always returns the Default Demo Account.
 * Future: replace with authenticated user's account_id.
 */
class AccountContext
{
    public function current(): Account
    {
        return Account::query()->firstOrCreate(
            ['slug' => Account::DEFAULT_SLUG],
            [
                'name' => 'Default Demo Account',
                'is_active' => true,
            ],
        );
    }
}
