<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add 'cancelled' to the SQLite borrowing status trigger,
     * and add damaged_book_fee / lost_book_fee / pickup_deadline_hours
     * to library_settings.
     */
    public function up(): void
    {
        // ── 1. Update SQLite triggers to allow 'cancelled' status ──────────
        if (DB::getDriverName() === 'sqlite') {
            DB::unprepared('DROP TRIGGER IF EXISTS borrowing_guard_insert;');
            DB::unprepared('DROP TRIGGER IF EXISTS borrowing_guard_update;');

            DB::unprepared(<<<'SQL'
CREATE TRIGGER IF NOT EXISTS borrowing_guard_insert
BEFORE INSERT ON borrowing
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.book_id IS NULL THEN RAISE(ABORT, 'book_id is required.')
        WHEN NEW.member_id IS NULL THEN RAISE(ABORT, 'member_id is required.')
        WHEN NEW.status IS NULL THEN RAISE(ABORT, 'status is required.')
        WHEN NEW.status NOT IN ('pending', 'approved', 'borrowed', 'returned', 'rejected', 'cancelled') THEN RAISE(ABORT, 'Invalid borrowing status.')
    END;
END;
SQL);

            DB::unprepared(<<<'SQL'
CREATE TRIGGER IF NOT EXISTS borrowing_guard_update
BEFORE UPDATE ON borrowing
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.book_id IS NULL THEN RAISE(ABORT, 'book_id is required.')
        WHEN NEW.member_id IS NULL THEN RAISE(ABORT, 'member_id is required.')
        WHEN NEW.status IS NULL THEN RAISE(ABORT, 'status is required.')
        WHEN NEW.status NOT IN ('pending', 'approved', 'borrowed', 'returned', 'rejected', 'cancelled') THEN RAISE(ABORT, 'Invalid borrowing status.')
    END;
END;
SQL);
        }

        // ── 2. Add new library settings columns ────────────────────────────
        Schema::table('library_settings', function (Blueprint $table) {
            // Flat fee when a borrowed book is returned damaged (VND)
            $table->decimal('damaged_book_fee', 12, 2)->default(50000)->after('grace_period_days');
            // Flat fee when a borrowed book is reported lost (VND)
            $table->decimal('lost_book_fee', 12, 2)->default(200000)->after('damaged_book_fee');
            // Hours an 'approved' loan can sit before it is auto-expired
            $table->unsignedInteger('pickup_deadline_hours')->default(48)->after('lost_book_fee');
        });
    }

    public function down(): void
    {
        // Restore triggers without 'cancelled'
        if (DB::getDriverName() === 'sqlite') {
            DB::unprepared('DROP TRIGGER IF EXISTS borrowing_guard_insert;');
            DB::unprepared('DROP TRIGGER IF EXISTS borrowing_guard_update;');

            DB::unprepared(<<<'SQL'
CREATE TRIGGER IF NOT EXISTS borrowing_guard_insert
BEFORE INSERT ON borrowing
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.book_id IS NULL THEN RAISE(ABORT, 'book_id is required.')
        WHEN NEW.member_id IS NULL THEN RAISE(ABORT, 'member_id is required.')
        WHEN NEW.status IS NULL THEN RAISE(ABORT, 'status is required.')
        WHEN NEW.status NOT IN ('pending', 'approved', 'borrowed', 'returned', 'rejected') THEN RAISE(ABORT, 'Invalid borrowing status.')
    END;
END;
SQL);

            DB::unprepared(<<<'SQL'
CREATE TRIGGER IF NOT EXISTS borrowing_guard_update
BEFORE UPDATE ON borrowing
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.book_id IS NULL THEN RAISE(ABORT, 'book_id is required.')
        WHEN NEW.member_id IS NULL THEN RAISE(ABORT, 'member_id is required.')
        WHEN NEW.status IS NULL THEN RAISE(ABORT, 'status is required.')
        WHEN NEW.status NOT IN ('pending', 'approved', 'borrowed', 'returned', 'rejected') THEN RAISE(ABORT, 'Invalid borrowing status.')
    END;
END;
SQL);
        }

        Schema::table('library_settings', function (Blueprint $table) {
            $table->dropColumn(['damaged_book_fee', 'lost_book_fee', 'pickup_deadline_hours']);
        });
    }
};
