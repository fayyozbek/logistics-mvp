<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    private const MAX_LIMIT = 100;

    private const DEFAULT_LIMIT = 50;

    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', self::DEFAULT_LIMIT), 1), self::MAX_LIMIT);

        $query = User::query()->orderBy('name');

        $total = $query->count();
        $users = $query->limit($limit)->get();

        return response()->json([
            'users' => UserResource::collection($users)->resolve(),
            'meta' => [
                'total' => $total,
                'limit' => $limit,
                'returned' => $users->count(),
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'user' => (new UserResource($user))->resolve(),
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'],
            'account_id' => $validated['accountId'] ?? null,
            'is_active' => $validated['isActive'] ?? true,
        ]);

        return response()->json([
            'user' => (new UserResource($user))->resolve(),
        ], 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();
        $actor = $request->user();

        if (array_key_exists('isActive', $validated) && $validated['isActive'] === false) {
            $this->ensureCanDeactivate($actor, $user);
        }

        $attributes = [];

        if (array_key_exists('name', $validated)) {
            $attributes['name'] = $validated['name'];
        }

        if (array_key_exists('email', $validated)) {
            $attributes['email'] = $validated['email'];
        }

        if (array_key_exists('password', $validated) && filled($validated['password'])) {
            $attributes['password'] = $validated['password'];
        }

        if (array_key_exists('role', $validated)) {
            $attributes['role'] = $validated['role'];
        }

        if (array_key_exists('accountId', $validated)) {
            $attributes['account_id'] = $validated['accountId'];
        }

        if (array_key_exists('isActive', $validated)) {
            $attributes['is_active'] = $validated['isActive'];
        }

        if ($attributes !== []) {
            $user->update($attributes);
        }

        if (array_key_exists('isActive', $validated) && $validated['isActive'] === false) {
            $user->tokens()->delete();
        }

        $user->refresh();

        return response()->json([
            'user' => (new UserResource($user))->resolve(),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->ensureCanDeactivate($request->user(), $user);

        $user->update(['is_active' => false]);
        $user->tokens()->delete();

        return response()->json([
            'message' => 'User deactivated.',
            'user' => (new UserResource($user->fresh()))->resolve(),
        ]);
    }

    private function ensureCanDeactivate(User $actor, User $target): void
    {
        if ($actor->id === $target->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot deactivate your own account.'],
            ]);
        }

        if ($target->role === UserRole::Admin && $target->is_active) {
            $activeAdminCount = User::query()
                ->where('role', UserRole::Admin)
                ->where('is_active', true)
                ->count();

            if ($activeAdminCount <= 1) {
                throw ValidationException::withMessages([
                    'user' => ['Cannot deactivate the last active admin account.'],
                ]);
            }
        }
    }
}
