<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_histories', function (Blueprint $table) {
            $table->id('history_id');
            $table->unsignedBigInteger('user_id');
            $table->string('user_type'); // 'student' | 'admin'
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('device_type')->nullable(); // 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
            $table->string('token_id')->nullable(); // Sanctum token ID for remote logout
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_histories');
    }
};
