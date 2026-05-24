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
            $table->integer('room_max_hours_per_booking')->default(3)->after('pickup_deadline_hours');
            $table->integer('room_max_bookings_per_day')->default(2)->after('room_max_hours_per_booking');
            $table->integer('room_advance_booking_days')->default(7)->after('room_max_bookings_per_day');
            $table->integer('room_min_group_size')->default(2)->after('room_advance_booking_days');
            $table->integer('room_checkin_window_minutes')->default(15)->after('room_min_group_size');
            $table->boolean('room_booking_requires_approval')->default(false)->after('room_checkin_window_minutes');
            $table->string('room_open_time', 5)->default('07:00')->after('room_booking_requires_approval');
            $table->string('room_close_time', 5)->default('21:00')->after('room_open_time');
            $table->integer('room_cancel_deadline_hours')->default(2)->after('room_close_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('library_settings', function (Blueprint $table) {
            $table->dropColumn([
                'room_max_hours_per_booking',
                'room_max_bookings_per_day',
                'room_advance_booking_days',
                'room_min_group_size',
                'room_checkin_window_minutes',
                'room_booking_requires_approval',
                'room_open_time',
                'room_close_time',
                'room_cancel_deadline_hours',
            ]);
        });
    }
};
