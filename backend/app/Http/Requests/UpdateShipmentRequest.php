<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ShipmentQuantityRules;
use App\Http\Requests\Concerns\ValidatesApiInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateShipmentRequest extends FormRequest
{
    use ShipmentQuantityRules;
    use ValidatesApiInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('cargoName') && ! $this->has('cargo')) {
            $merge['cargo'] = $this->input('cargoName');
        }

        if ($this->has('plannedDelivery') && ! $this->has('estimatedDelivery')) {
            $merge['estimatedDelivery'] = $this->input('plannedDelivery');
        }

        if ($merge !== []) {
            $this->merge($merge);
        }

        $this->prepareShipmentQuantityDefaults();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'clientId' => ['sometimes', 'required', 'integer', 'exists:clients,id'],
            'managerId' => ['sometimes', 'nullable', 'integer', 'exists:managers,id'],
            'type' => ['sometimes', 'required', 'string', Rule::in(['auto', 'air', 'sea', 'intermodal'])],
            'origin' => ['sometimes', 'required', 'string', 'max:255'],
            'destination' => ['sometimes', 'required', 'string', 'max:255'],
            'cargo' => ['sometimes', 'nullable', 'string', 'max:255'],
            'cargoName' => ['sometimes', 'nullable', 'string', 'max:255'],
            ...$this->shipmentQuantityRules(sometimes: true),
            'plannedPickup' => ['sometimes', 'nullable', 'date'],
            'estimatedDelivery' => ['sometimes', 'nullable', 'date'],
            'plannedDelivery' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'telegramNotifications' => ['sometimes', 'boolean'],
        ];
    }
}
