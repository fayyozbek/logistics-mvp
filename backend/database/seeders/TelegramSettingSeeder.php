<?php

namespace Database\Seeders;

use App\Models\TelegramSetting;
use Database\Seeders\Support\DemoData;
use Illuminate\Database\Seeder;

class TelegramSettingSeeder extends Seeder
{
    private const DEMO_SETTINGS_ID = 1;

    public function run(): void
    {
        TelegramSetting::query()->updateOrCreate(
            ['id' => self::DEMO_SETTINGS_ID],
            array_merge(
                ['id' => self::DEMO_SETTINGS_ID],
                DemoData::telegramSettings(),
            ),
        );
    }
}
