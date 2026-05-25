<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesApiInput;
use Illuminate\Foundation\Http\FormRequest;

class UpdateClientRequest extends FormRequest
{
    use ValidatesApiInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('name') && ! $this->has('contact')) {
            $merge['contact'] = $this->input('name');
        }

        if ($this->has('contactName') && ! $this->has('contact')) {
            $merge['contact'] = $this->input('contactName');
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'company' => ['sometimes', 'required', 'string', 'max:255'],
            'name' => ['sometimes', 'string', 'max:255'],
            'contact' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:64'],
            'country' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }
}
