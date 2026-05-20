<?php

namespace App\Http\Requests;

use App\Models\TelegramSetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateTelegramSettingsRequest extends FormRequest
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
        $rules = [
            'chatId' => ['sometimes', 'nullable', 'string', 'max:64'],
            'connected' => ['sometimes', 'boolean'],
            'botToken' => ['sometimes', 'nullable', 'string', 'max:255'],
            'eventFlags' => ['sometimes', 'array'],
        ];

        foreach (TelegramSetting::EVENT_FLAG_KEYS as $key) {
            $rules["eventFlags.{$key}"] = ['sometimes', 'boolean'];
        }

        return $rules;
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->has('eventFlags') || ! is_array($this->input('eventFlags'))) {
                return;
            }

            $unknown = array_diff(
                array_keys($this->input('eventFlags')),
                TelegramSetting::EVENT_FLAG_KEYS,
            );

            if ($unknown !== []) {
                $validator->errors()->add('eventFlags', 'The event flags contain invalid keys.');
            }
        });
    }
}
