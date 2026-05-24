<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('library_settings')) {
            Schema::table('library_settings', function (Blueprint $table) {
                $table->decimal('fine_per_day', 15, 2)->default(5000);
            });
        }

        Schema::create('fines', function (Blueprint $table) {
            $table->id('fine_id');
            $table->unsignedBigInteger('loan_id');
            $table->unsignedBigInteger('member_id');
            $table->decimal('amount', 15, 2);
            $table->string('reason')->default('overdue');
            $table->string('status')->default('unpaid');
            $table->timestamp('paid_at')->nullable();
            $table->unsignedBigInteger('waived_by')->nullable();
            $table->text('waived_reason')->nullable();
            $table->timestamps();

            $table->foreign('loan_id')->references('loan_id')->on('borrowing')->onDelete('cascade');
            $table->foreign('member_id')->references('member_id')->on('members')->onDelete('cascade');
            $table->foreign('waived_by')->references('librarian_id')->on('librarians')->nullOnDelete();
            $table->unique('loan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fines');
        if (Schema::hasTable('library_settings')) {
            Schema::table('library_settings', function (Blueprint $table) {
                $table->dropColumn('fine_per_day');
            });
        }
    }
};
