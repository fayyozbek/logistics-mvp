<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClientRequest extends FormRequest
{
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
            'company' => ['sometimes', 'required', 'string', 'max:255'],
            'contact' => ['sometimes', 'nullable', 'string', 'max:255'],
            'contactName' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:64'],
            'country' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
