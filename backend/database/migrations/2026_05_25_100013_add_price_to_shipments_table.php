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
            $table->decimal('price_amount', 12, 2)->default(0)->after('notes');
            $table->string('currency', 3)->default('USD')->after('price_amount');
        });

        if (Schema::hasTable('finance_records')) {
            $financeRows = DB::table('finance_records')
                ->select('shipment_id', 'total_amount', 'currency')
                ->get();

            foreach ($financeRows as $row) {
                DB::table('shipments')
                    ->where('id', $row->shipment_id)
                    ->update([
                        'price_amount' => $row->total_amount,
                        'currency' => $row->currency,
                    ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['price_amount', 'currency']);
        });
    }
};
