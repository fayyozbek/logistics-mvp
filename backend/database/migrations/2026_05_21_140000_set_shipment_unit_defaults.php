<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('weight_unit', 16)->default('kg')->nullable()->change();
            $table->string('volume_unit', 16)->default('m3')->nullable()->change();
        });

        DB::table('shipments')
            ->whereNotNull('weight')
            ->whereNull('weight_unit')
            ->update(['weight_unit' => 'kg']);

        DB::table('shipments')
            ->whereNotNull('volume')
            ->whereNull('volume_unit')
            ->update(['volume_unit' => 'm3']);
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('weight_unit', 16)->nullable()->default(null)->change();
            $table->string('volume_unit', 16)->nullable()->default(null)->change();
        });
    }
};
