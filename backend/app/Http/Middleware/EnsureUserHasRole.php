<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\RolePermissions;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles  Comma-separated role slugs (e.g. admin or admin,finance)
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Account is disabled.'], 403);
        }

        $allowed = collect($roles)
            ->flatMap(fn (string $role) => array_map('trim', explode(',', $role)))
            ->filter()
            ->values()
            ->all();

        if (! RolePermissions::allows($user, $allowed)) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        return $next($request);
    }
}
