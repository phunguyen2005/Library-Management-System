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
        Schema::table('library_settings', function (Blueprint $table) {
            $table->integer('room_max_hours_per_week')->default(4)->after('room_max_hours_per_booking');
        });

        Schema::table('room_bookings', function (Blueprint $table) {
            $table->boolean('is_walkin')->default(false)->after('booking_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('library_settings', function (Blueprint $table) {
            $table->dropColumn('room_max_hours_per_week');
        });

        Schema::table('room_bookings', function (Blueprint $table) {
            $table->dropColumn('is_walkin');
        });
    }
};
