<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Http\Requests\Concerns\ValidatesApiInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
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
        $userId = $this->route('user')?->id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'max:255'],
            'role' => ['sometimes', 'required', 'string', Rule::in(UserRole::values())],
            'accountId' => ['sometimes', 'nullable', 'integer', 'exists:accounts,id'],
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
