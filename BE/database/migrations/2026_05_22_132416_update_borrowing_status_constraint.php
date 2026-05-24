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
        if (\Illuminate\Support\Facades\DB::getDriverName() !== 'sqlite') {
            return;
        }

        \Illuminate\Support\Facades\DB::unprepared('DROP TRIGGER IF EXISTS borrowing_guard_insert;');
        \Illuminate\Support\Facades\DB::unprepared('DROP TRIGGER IF EXISTS borrowing_guard_update;');

        \Illuminate\Support\Facades\DB::unprepared(<<<'SQL'
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

        \Illuminate\Support\Facades\DB::unprepared(<<<'SQL'
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

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (\Illuminate\Support\Facades\DB::getDriverName() !== 'sqlite') {
            return;
        }

        \Illuminate\Support\Facades\DB::unprepared('DROP TRIGGER IF EXISTS borrowing_guard_insert;');
        \Illuminate\Support\Facades\DB::unprepared('DROP TRIGGER IF EXISTS borrowing_guard_update;');

        // In a real scenario, we'd recreate the old triggers, but keeping it simple for the rollback.
    }
};
