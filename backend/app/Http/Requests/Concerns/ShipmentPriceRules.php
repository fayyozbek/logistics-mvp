<?php

namespace App\Http\Requests\Concerns;

use App\Support\ShipmentCurrencies;
use Illuminate\Validation\Rule;

trait ShipmentPriceRules
{
    /**
     * @return array<string, mixed>
     */
    protected function shipmentPriceRules(bool $sometimes = false): array
    {
        $required = $sometimes ? 'sometimes' : 'nullable';

        return [
            'priceAmount' => [$required, 'numeric', 'min:0', 'max:999999999.99'],
            'currency' => [$required, 'string', 'size:3', Rule::in(ShipmentCurrencies::ALLOWED)],
        ];
    }
}
