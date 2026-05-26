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
            $table->boolean('notify_borrow_status')->default(true)->after('notify_new_books');
            $table->boolean('notify_room_status')->default(true)->after('notify_borrow_status');
            $table->boolean('notify_room_reminder')->default(true)->after('notify_room_status');
            $table->boolean('notify_fine_status')->default(true)->after('notify_room_reminder');
            $table->boolean('notify_reservation')->default(true)->after('notify_fine_status');
        });

        Schema::table('room_bookings', function (Blueprint $table) {
            $table->boolean('reminder_sent')->default(false)->after('booking_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn([
                'notify_borrow_status',
                'notify_room_status',
                'notify_room_reminder',
                'notify_fine_status',
                'notify_reservation'
            ]);
        });

        Schema::table('room_bookings', function (Blueprint $table) {
            $table->dropColumn('reminder_sent');
        });
    }
};
