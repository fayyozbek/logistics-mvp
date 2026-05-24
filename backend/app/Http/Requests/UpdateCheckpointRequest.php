<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesApiInput;
use App\Models\Checkpoint;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCheckpointRequest extends FormRequest
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
            'city' => ['sometimes', 'required', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:8'],
            'address' => ['sometimes', 'required', 'string', 'max:255'],
            'plannedAt' => ['sometimes', 'required', 'date'],
            'arrivedAt' => ['nullable', 'date'],
            'status' => ['sometimes', 'string', Rule::in(Checkpoint::STATUSES)],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
