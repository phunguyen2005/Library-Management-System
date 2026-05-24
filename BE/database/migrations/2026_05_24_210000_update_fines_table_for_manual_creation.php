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
        Schema::table('fines', function (Blueprint $table) {
            // Drop the unique constraint/index on loan_id
            // In SQLite, Laravel drops unique constraints by recreating the table structure.
            $table->dropUnique('fines_loan_id_unique');

            // Make loan_id nullable
            $table->unsignedBigInteger('loan_id')->nullable()->change();

            // Add notes column
            $table->text('notes')->nullable()->after('waived_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fines', function (Blueprint $table) {
            // Remove notes column
            $table->dropColumn('notes');

            // Make loan_id non-nullable (needs to have no null values to revert successfully)
            $table->unsignedBigInteger('loan_id')->nullable(false)->change();

            // Re-add unique constraint
            $table->unique('loan_id');
        });
    }
};
