<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('provider_name')->nullable()->after('email');
            $table->string('provider_id')->nullable()->after('provider_name');
            $table->string('password')->nullable()->change();
            $table->string('phone_number', 15)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn(['provider_name', 'provider_id']);
            $table->string('password')->nullable(false)->change();
        });
    }
};
