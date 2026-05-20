<?php

namespace App\Http\Requests;

use App\Models\Checkpoint;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCheckpointRequest extends FormRequest
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
            'city' => ['sometimes', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:8'],
            'address' => ['sometimes', 'string', 'max:255'],
            'plannedAt' => ['sometimes', 'date'],
            'arrivedAt' => ['nullable', 'date'],
            'status' => ['sometimes', 'string', Rule::in(Checkpoint::STATUSES)],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
