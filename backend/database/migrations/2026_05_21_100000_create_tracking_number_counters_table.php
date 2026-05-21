<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracking_number_counters', function (Blueprint $table) {
            $table->unsignedSmallInteger('year')->primary();
            $table->unsignedInteger('last_sequence');
            $table->timestamps();
        });

        $this->bootstrapFromExistingShipments();
    }

    public function down(): void
    {
        Schema::dropIfExists('tracking_number_counters');
    }

    private function bootstrapFromExistingShipments(): void
    {
        $maxByYear = [];

        $trackingNumbers = DB::table('shipments')->pluck('tracking_number');

        foreach ($trackingNumbers as $trackingNumber) {
            if (! is_string($trackingNumber) || ! preg_match('/^LGX-(\d{4})-(\d+)$/', $trackingNumber, $matches)) {
                continue;
            }

            $year = (int) $matches[1];
            $sequence = (int) $matches[2];
            $maxByYear[$year] = max($maxByYear[$year] ?? 0, $sequence);
        }

        $now = now();

        foreach ($maxByYear as $year => $lastSequence) {
            DB::table('tracking_number_counters')->insert([
                'year' => $year,
                'last_sequence' => $lastSequence,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
};
