<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ShipmentQuantityRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreShipmentRequest extends FormRequest
{
    use ShipmentQuantityRules;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->prepareShipmentQuantityDefaults();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'trackingNumber' => ['sometimes', 'nullable', 'string', 'max:64', 'unique:shipments,tracking_number'],
            'type' => ['required', 'string', Rule::in(['auto', 'air', 'sea', 'intermodal'])],
            'status' => ['sometimes', 'string', Rule::in(['planned', 'in_transit', 'at_checkpoint', 'delivered', 'delayed'])],
            'clientId' => ['required', 'integer', 'exists:clients,id'],
            'managerId' => ['nullable', 'integer', 'exists:managers,id'],
            'origin' => ['required', 'string', 'max:255'],
            'destination' => ['required', 'string', 'max:255'],
            'cargo' => ['nullable', 'string', 'max:255'],
            ...$this->shipmentQuantityRules(),
            'estimatedDelivery' => ['nullable', 'date'],
            'telegramNotifications' => ['sometimes', 'boolean'],
            'checkpoints' => ['sometimes', 'array'],
            'checkpoints.*.city' => ['required', 'string', 'max:255'],
            'checkpoints.*.country' => ['nullable', 'string', 'max:8'],
            'checkpoints.*.address' => ['required', 'string', 'max:255'],
            'checkpoints.*.plannedAt' => ['required', 'date'],
            'checkpoints.*.arrivedAt' => ['nullable', 'date'],
            'checkpoints.*.status' => ['sometimes', 'string', Rule::in(['passed', 'current', 'upcoming'])],
            'checkpoints.*.note' => ['nullable', 'string', 'max:500'],
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
