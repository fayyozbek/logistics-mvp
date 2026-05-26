<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Http\Requests\Concerns\ValidatesApiInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    use ValidatesApiInput;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'role' => ['required', 'string', Rule::in(UserRole::values())],
            'accountId' => ['nullable', 'integer', 'exists:accounts,id'],
            'isActive' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function extraApiAttributes(): array
    {
        return [
            'password' => 'пароль',
            'accountId' => 'аккаунт',
            'isActive' => 'активность',
        ];
    }
}
