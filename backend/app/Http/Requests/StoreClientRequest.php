<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesApiInput;
use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
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
            'company' => ['required', 'string', 'max:255'],
            'name' => ['sometimes', 'string', 'max:255'],
            'contact' => ['required_without_all:name,contactName', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:64'],
            'country' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
        ];
    }
}
