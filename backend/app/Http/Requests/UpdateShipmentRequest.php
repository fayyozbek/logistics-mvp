<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateShipmentRequest extends FormRequest
{
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
            'weight' => ['sometimes', 'nullable', 'string', 'max:64'],
            'weightUnit' => ['sometimes', 'nullable', 'string', 'max:16'],
            'volume' => ['sometimes', 'nullable', 'string', 'max:64'],
            'volumeUnit' => ['sometimes', 'nullable', 'string', 'max:16'],
            'plannedPickup' => ['sometimes', 'nullable', 'date'],
            'estimatedDelivery' => ['sometimes', 'nullable', 'date'],
            'plannedDelivery' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'telegramNotifications' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'clientId.required' => 'Client is required.',
            'type.required' => 'Transport type is required.',
            'origin.required' => 'Origin is required.',
            'destination.required' => 'Destination is required.',
        ];
    }
}
