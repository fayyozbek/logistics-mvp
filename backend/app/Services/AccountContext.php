<?php

namespace App\Services;

use App\Models\Account;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

/**
 * Resolves the active account and Telegram scope for the current request.
 */
class AccountContext
{
    public function currentUser(): ?User
    {
        /** @var User|null $user */
        $user = Auth::user();

        return $user;
    }

    public function isAuthenticated(): bool
    {
        return Auth::check();
    }

    /**
     * Default demo account for unauthenticated local/demo usage.
     */
    public function demoAccount(): Account
    {
        return Account::query()->firstOrCreate(
            ['slug' => Account::DEFAULT_SLUG],
            [
                'name' => 'Admin Demo Account',
                'is_active' => true,
            ],
        );
    }

    /**
     * Active account for the current principal.
     *
     * Authenticated users with account_id use their account; otherwise demo account.
     */
    public function current(): Account
    {
        $user = $this->currentUser();

        if ($user?->account_id !== null) {
            return Account::query()->findOrFail($user->account_id);
        }

        return $this->demoAccount();
    }

    /**
     * Telegram settings/journal scope for the current request.
     *
     * @return array{account_id: int|null, user_id: int|null, demo: bool}
     */
    public function telegramScope(): array
    {
        $user = $this->currentUser();

        if ($user === null) {
            return [
                'account_id' => $this->demoAccount()->id,
                'user_id' => null,
                'demo' => true,
            ];
        }

        if ($user->account_id !== null) {
            return [
                'account_id' => $user->account_id,
                'user_id' => $user->id,
                'demo' => false,
            ];
        }

        return [
            'account_id' => null,
            'user_id' => $user->id,
            'demo' => false,
        ];
    }
}
