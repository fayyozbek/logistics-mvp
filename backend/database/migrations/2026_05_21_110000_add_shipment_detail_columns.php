<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('weight_unit', 16)->nullable()->after('weight');
            $table->string('volume_unit', 16)->nullable()->after('volume');
            $table->date('planned_pickup')->nullable()->after('estimated_delivery');
            $table->text('notes')->nullable()->after('telegram_notifications');
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['weight_unit', 'volume_unit', 'planned_pickup', 'notes']);
        });
    }
};
