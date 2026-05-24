<?php

namespace Database\Seeders\Support;

use App\Enums\UserRole;

/**
 * Demo account + user definitions for local seeding and Telegram isolation QA.
 */
final class DemoAccounts
{
    /** Slug for the primary demo account (admin / unauthenticated fallback). */
    public const ADMIN_SLUG = 'admin-demo';

    /**
     * @return list<array{
     *     email: string,
     *     slug: string,
     *     name: string,
     *     user_name: string,
     *     role: UserRole,
     *     telegram_display_name: string,
     *     telegram_chat_id: string
     * }>
     */
    public static function all(): array
    {
        return [
            [
                'email' => 'admin@example.com',
                'slug' => self::ADMIN_SLUG,
                'name' => 'Admin Demo Account',
                'user_name' => 'Demo Admin',
                'role' => UserRole::Admin,
                'telegram_display_name' => 'Admin Demo',
                'telegram_chat_id' => '-1001234567890',
            ],
            [
                'email' => 'manager@example.com',
                'slug' => 'manager-demo',
                'name' => 'Manager Demo Account',
                'user_name' => 'Demo Manager',
                'role' => UserRole::Manager,
                'telegram_display_name' => 'Manager Demo',
                'telegram_chat_id' => '-1001234567891',
            ],
            [
                'email' => 'operator@example.com',
                'slug' => 'operator-demo',
                'name' => 'Operator Demo Account',
                'user_name' => 'Demo Operator',
                'role' => UserRole::Operator,
                'telegram_display_name' => 'Operator Demo',
                'telegram_chat_id' => '-1001234567892',
            ],
            [
                'email' => 'finance@example.com',
                'slug' => 'finance-demo',
                'name' => 'Finance Demo Account',
                'user_name' => 'Demo Finance',
                'role' => UserRole::Finance,
                'telegram_display_name' => 'Finance Demo',
                'telegram_chat_id' => '-1001234567893',
            ],
            [
                'email' => 'viewer@example.com',
                'slug' => 'viewer-demo',
                'name' => 'Viewer Demo Account',
                'user_name' => 'Demo Viewer',
                'role' => UserRole::Viewer,
                'telegram_display_name' => 'Viewer Demo',
                'telegram_chat_id' => '-1001234567894',
            ],
        ];
    }

    /**
     * @return array<string, array{email: string, slug: string, name: string, user_name: string, role: UserRole, telegram_display_name: string, telegram_chat_id: string}>
     */
    public static function keyedBySlug(): array
    {
        $keyed = [];
        foreach (self::all() as $row) {
            $keyed[$row['slug']] = $row;
        }

        return $keyed;
    }
}
