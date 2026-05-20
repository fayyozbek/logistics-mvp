<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_number')->unique();
            $table->string('transport_type', 32);
            $table->string('status', 32)->index();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('manager_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('route_id')->nullable()->constrained()->nullOnDelete();
            $table->string('origin');
            $table->string('destination');
            $table->string('cargo')->nullable();
            $table->string('weight')->nullable();
            $table->string('volume')->nullable();
            $table->date('estimated_delivery')->nullable();
            $table->boolean('telegram_notifications')->default(false);
            $table->timestamps();

            $table->index('client_id');
            $table->index('manager_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
