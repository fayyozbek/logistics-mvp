<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesApiInput;
use App\Models\Shipment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateShipmentStatusRequest extends FormRequest
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
            'status' => ['required', 'string', Rule::in(Shipment::STATUSES)],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
