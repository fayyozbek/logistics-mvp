<?php

namespace Database\Seeders\Support;

final class DemoSeedState
{
    /** @var array<string, int> */
    public static array $clientIds = [];

    /** @var array<string, int> */
    public static array $managerIds = [];

    /** @var array<string, int> */
    public static array $shipmentIds = [];

    public static function reset(): void
    {
        self::$clientIds = [];
        self::$managerIds = [];
        self::$shipmentIds = [];
    }
}
