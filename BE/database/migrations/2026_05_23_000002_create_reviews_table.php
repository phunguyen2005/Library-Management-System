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
        Schema::create('reviews', function (Blueprint $table) {
            $table->id('review_id');
            $table->unsignedBigInteger('member_id');
            $table->unsignedBigInteger('book_id');
            $table->unsignedBigInteger('loan_id')->unique(); // 1 review per borrow limit
            $table->tinyInteger('rating')->unsigned(); // 1 to 5 stars
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->foreign('member_id')->references('member_id')->on('members')->cascadeOnDelete();
            $table->foreign('book_id')->references('book_id')->on('books')->cascadeOnDelete();
            $table->foreign('loan_id')->references('loan_id')->on('borrowing')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
