<?php

namespace App\Http\Requests;

use App\Models\Checkpoint;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCheckpointRequest extends FormRequest
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
            'city' => ['required', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:8'],
            'address' => ['required', 'string', 'max:255'],
            'plannedAt' => ['required', 'date'],
            'arrivedAt' => ['nullable', 'date'],
            'status' => ['sometimes', 'string', Rule::in(Checkpoint::STATUSES)],
            'note' => ['nullable', 'string', 'max:500'],
            'insertAfter' => ['sometimes', 'integer', 'min:-1'],
        ];
    }
}
