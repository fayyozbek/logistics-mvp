<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\User;

/**
 * Central role → ability map for Logistics MVP+ API.
 *
 * @see docs/AUTH_ROLES_SCOPE.md
 */
final class RolePermissions
{
    /** @var list<string> */
    public const ALL = ['admin', 'manager', 'operator', 'finance', 'viewer'];

    /** @var list<string> */
    public const VIEWER_PLUS = ['admin', 'manager', 'operator', 'finance', 'viewer'];

    /** @var list<string> */
    public const OPERATOR_PLUS = ['admin', 'manager', 'operator'];

    /** @var list<string> */
    public const MANAGER_PLUS = ['admin', 'manager'];

    /** @var list<string> */
    public const FINANCE_WRITERS = ['admin', 'finance'];

    /** @var list<string> */
    public const TELEGRAM_READ = ['admin', 'manager', 'operator', 'finance'];

    /** @var list<string> */
    public const TELEGRAM_JOURNAL = ['admin', 'manager'];

    /** @var list<string> */
    public const ADMIN_ONLY = ['admin'];

    /**
     * @param  list<string>  $allowedRoles
     */
    public static function allows(User $user, array $allowedRoles): bool
    {
        if (! $user->is_active) {
            return false;
        }

        $role = $user->role instanceof UserRole ? $user->role->value : (string) $user->role;

        return in_array($role, $allowedRoles, true);
    }

    public static function roleValue(User $user): string
    {
        return $user->role instanceof UserRole ? $user->role->value : (string) $user->role;
    }
}
