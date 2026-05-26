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
        Schema::create('borrowing', function (Blueprint $table) {
            $table->id('loan_id');
            $table->unsignedBigInteger('book_id');
            $table->unsignedBigInteger('member_id');
            $table->date('borrow_date')->default(\Illuminate\Support\Facades\DB::raw('(CURRENT_DATE)'));
            $table->date('return_date')->nullable();
            $table->unsignedBigInteger('librarian_id')->nullable();

            $table->foreign('book_id')->references('book_id')->on('books')->restrictOnDelete();
            $table->foreign('member_id')->references('member_id')->on('members')->restrictOnDelete();
            $table->foreign('librarian_id')->references('librarian_id')->on('librarians')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('borrowing');
    }
};
