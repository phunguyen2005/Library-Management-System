<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add repairing_quantity column to books table
        Schema::table('books', function (Blueprint $table) {
            $table->unsignedInteger('repairing_quantity')->default(0)->after('available_quantity');
        });

        // 2. Update SQLite triggers to enforce repairing_quantity integrity
        if (DB::getDriverName() === 'sqlite') {
            DB::unprepared('DROP TRIGGER IF EXISTS books_quantity_guard_insert;');
            DB::unprepared('DROP TRIGGER IF EXISTS books_quantity_guard_update;');

            DB::unprepared(<<<'SQL'
CREATE TRIGGER IF NOT EXISTS books_quantity_guard_insert
BEFORE INSERT ON books
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.total_quantity < 0 THEN RAISE(ABORT, 'total_quantity must be non-negative.')
        WHEN NEW.available_quantity < 0 THEN RAISE(ABORT, 'available_quantity must be non-negative.')
        WHEN NEW.repairing_quantity < 0 THEN RAISE(ABORT, 'repairing_quantity must be non-negative.')
        WHEN NEW.available_quantity + NEW.repairing_quantity > NEW.total_quantity THEN RAISE(ABORT, 'available_quantity + repairing_quantity cannot exceed total_quantity.')
    END;
END;
SQL);

            DB::unprepared(<<<'SQL'
CREATE TRIGGER IF NOT EXISTS books_quantity_guard_update
BEFORE UPDATE ON books
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.total_quantity < 0 THEN RAISE(ABORT, 'total_quantity must be non-negative.')
        WHEN NEW.available_quantity < 0 THEN RAISE(ABORT, 'available_quantity must be non-negative.')
        WHEN NEW.repairing_quantity < 0 THEN RAISE(ABORT, 'repairing_quantity must be non-negative.')
        WHEN NEW.available_quantity + NEW.repairing_quantity > NEW.total_quantity THEN RAISE(ABORT, 'available_quantity + repairing_quantity cannot exceed total_quantity.')
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
        if (DB::getDriverName() === 'sqlite') {
            DB::unprepared('DROP TRIGGER IF EXISTS books_quantity_guard_insert;');
            DB::unprepared('DROP TRIGGER IF EXISTS books_quantity_guard_update;');

            // Restore original triggers
            DB::unprepared(<<<'SQL'
CREATE TRIGGER IF NOT EXISTS books_quantity_guard_insert
BEFORE INSERT ON books
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.total_quantity < 0 THEN RAISE(ABORT, 'total_quantity must be non-negative.')
        WHEN NEW.available_quantity < 0 THEN RAISE(ABORT, 'available_quantity must be non-negative.')
        WHEN NEW.available_quantity > NEW.total_quantity THEN RAISE(ABORT, 'available_quantity cannot exceed total_quantity.')
    END;
END;
SQL);

            DB::unprepared(<<<'SQL'
CREATE TRIGGER IF NOT EXISTS books_quantity_guard_update
BEFORE UPDATE ON books
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.total_quantity < 0 THEN RAISE(ABORT, 'total_quantity must be non-negative.')
        WHEN NEW.available_quantity < 0 THEN RAISE(ABORT, 'available_quantity must be non-negative.')
        WHEN NEW.available_quantity > NEW.total_quantity THEN RAISE(ABORT, 'available_quantity cannot exceed total_quantity.')
    END;
END;
SQL);
        }

        Schema::table('books', function (Blueprint $table) {
            $table->dropColumn('repairing_quantity');
        });
    }
};
