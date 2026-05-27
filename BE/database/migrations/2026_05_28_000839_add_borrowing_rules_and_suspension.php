<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('borrowing', function (Blueprint $table) {
            $table->timestamp('approved_at')->nullable()->after('librarian_id');
        });

        Schema::table('members', function (Blueprint $table) {
            $table->timestamp('borrow_suspended_until')->nullable()->after('last_check_in_at');
        });

        Schema::table('library_settings', function (Blueprint $table) {
            $table->unsignedInteger('max_missed_pickups')->default(3)->after('pickup_deadline_hours');
            $table->unsignedInteger('suspension_duration_days')->default(14)->after('max_missed_pickups');
        });
    }

    public function down(): void
    {
        Schema::table('library_settings', function (Blueprint $table) {
            $table->dropColumn(['max_missed_pickups', 'suspension_duration_days']);
        });

        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn('borrow_suspended_until');
        });

        Schema::table('borrowing', function (Blueprint $table) {
            $table->dropColumn('approved_at');
        });
    }
};
