<?php

namespace App\Support;

final class ShipmentCurrencies
{
    /** @var list<string> */
    public const ALLOWED = ['USD', 'KRW', 'UZS', 'KZT', 'GEL'];

    public const DEFAULT = 'USD';
}
