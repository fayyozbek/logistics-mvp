<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Validation\Rule;

trait ShipmentQuantityRules
{
    /**
     * @return array<string, mixed>
     */
    protected function shipmentQuantityRules(bool $sometimes = false): array
    {
        $leading = $sometimes ? ['sometimes'] : [];

        return [
            'weight' => array_merge($leading, [
                'nullable',
                'string',
                'max:32',
                'regex:/^\d+(?:\.\d{1,3})?$/',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value !== null && $value !== '' && (float) $value <= 0) {
                        $fail('Укажите положительное число.');
                    }
                },
            ]),
            'weightUnit' => array_merge($leading, [
                Rule::requiredIf(fn () => $this->filled('weight')),
                'nullable',
                'string',
                Rule::in(['kg', 'ton']),
            ]),
            'volume' => array_merge($leading, [
                'nullable',
                'string',
                'max:32',
                'regex:/^\d+(?:\.\d{1,3})?$/',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value !== null && $value !== '' && (float) $value <= 0) {
                        $fail('Укажите положительное число.');
                    }
                },
            ]),
            'volumeUnit' => array_merge($leading, [
                Rule::requiredIf(fn () => $this->filled('volume')),
                'nullable',
                'string',
                Rule::in(['m3', 'cbm']),
            ]),
        ];
    }

    protected function prepareShipmentQuantityDefaults(): void
    {
        $merge = [];

        if ($this->filled('weight') && ! $this->filled('weightUnit')) {
            $merge['weightUnit'] = 'kg';
        }

        if ($this->filled('volume') && ! $this->filled('volumeUnit')) {
            $merge['volumeUnit'] = 'm3';
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }
}
