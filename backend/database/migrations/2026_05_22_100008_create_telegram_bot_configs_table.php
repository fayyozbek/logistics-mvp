<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telegram_bot_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
            $table->string('bot_username')->nullable();
            $table->text('bot_token_encrypted')->nullable();
            $table->string('chat_id')->nullable();
            $table->boolean('enabled')->default(false);
            $table->boolean('notifications_enabled')->default(true);
            $table->boolean('notify_shipment_created')->default(true);
            $table->boolean('notify_status_changed')->default(true);
            $table->boolean('notify_checkpoint_added')->default(true);
            $table->timestamp('last_tested_at')->nullable();
            $table->string('last_test_status')->nullable();
            $table->timestamps();

            $table->unique('account_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_bot_configs');
    }
};
