<?php

namespace Database\Seeders;

use App\Models\TelegramSetting;
use Database\Seeders\Support\DemoData;
use Illuminate\Database\Seeder;

class TelegramSettingSeeder extends Seeder
{
    public function run(): void
    {
        TelegramSetting::query()->create(DemoData::telegramSettings());
    }
}
