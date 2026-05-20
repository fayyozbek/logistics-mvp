<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checkpoints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence')->default(0);
            $table->string('city');
            $table->string('country', 8)->nullable();
            $table->string('address');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->dateTime('planned_at');
            $table->dateTime('arrived_at')->nullable();
            $table->string('status', 16);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index('shipment_id');
            $table->index(['shipment_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checkpoints');
    }
};
