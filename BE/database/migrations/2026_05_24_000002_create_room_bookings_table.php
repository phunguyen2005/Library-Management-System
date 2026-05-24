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
        Schema::create('room_bookings', function (Blueprint $table) {
            $table->id('booking_id');
            $table->foreignId('room_id')->constrained('rooms', 'room_id')->cascadeOnDelete();
            $table->unsignedBigInteger('member_id');
            $table->foreign('member_id')->references('member_id')->on('members')->cascadeOnDelete();
            $table->date('date');
            $table->time('start_time');
            $table->time('end_time');
            $table->string('purpose', 255)->nullable();
            $table->integer('group_size');
            $table->string('status', 20)->default('pending'); // pending | approved | rejected | cancelled | completed | no_show
            $table->text('rejection_reason')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->foreign('approved_by')->references('librarian_id')->on('librarians')->nullOnDelete();
            $table->timestamp('check_in_at')->nullable();
            $table->timestamp('check_out_at')->nullable();
            $table->string('booking_code', 10)->unique();
            $table->timestamps();

            // Indexes for query performance and conflict checks
            $table->index(['room_id', 'date', 'status']);
            $table->index(['member_id', 'date']);
        });

        // Add SQLite trigger if sqlite driver is used to validate statuses
        if (Illuminate\Support\Facades\DB::getDriverName() === 'sqlite') {
            Illuminate\Support\Facades\DB::unprepared(<<<'SQL'
CREATE TRIGGER IF NOT EXISTS room_bookings_guard_insert
BEFORE INSERT ON room_bookings
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.status NOT IN ('pending', 'approved', 'rejected', 'cancelled', 'completed', 'no_show') THEN
            RAISE(ABORT, 'Invalid room booking status.')
    END;
END;
SQL);

            Illuminate\Support\Facades\DB::unprepared(<<<'SQL'
CREATE TRIGGER IF NOT EXISTS room_bookings_guard_update
BEFORE UPDATE ON room_bookings
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.status NOT IN ('pending', 'approved', 'rejected', 'cancelled', 'completed', 'no_show') THEN
            RAISE(ABORT, 'Invalid room booking status.')
    END;
END;
SQL);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Illuminate\Support\Facades\DB::getDriverName() === 'sqlite') {
            Illuminate\Support\Facades\DB::unprepared('DROP TRIGGER IF EXISTS room_bookings_guard_insert;');
            Illuminate\Support\Facades\DB::unprepared('DROP TRIGGER IF EXISTS room_bookings_guard_update;');
        }
        Schema::dropIfExists('room_bookings');
    }
};
