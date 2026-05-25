<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendTestMessageRequest extends FormRequest
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
            'chatId'  => ['sometimes', 'nullable', 'string', 'max:64'],
            'message' => ['sometimes', 'nullable', 'string', 'max:4096'],
        ];
    }
}
