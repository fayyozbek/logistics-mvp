<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('shipments', 'deleted_at')) {
            Schema::table('shipments', function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('shipments', 'deleted_at')) {
            Schema::table('shipments', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};
