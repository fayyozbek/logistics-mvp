<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesApiInput;
use Illuminate\Foundation\Http\FormRequest;

class StoreManagerRequest extends FormRequest
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
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:64'],
            'telegramId' => ['nullable', 'string', 'max:64'],
            'region' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:128'],
            'department' => ['nullable', 'string', 'max:128'],
            'avatar' => ['nullable', 'string', 'max:8'],
        ];
    }
}
