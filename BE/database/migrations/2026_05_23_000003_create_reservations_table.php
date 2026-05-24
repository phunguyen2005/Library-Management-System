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
        Schema::create('reservations', function (Blueprint $table) {
            $table->id('reservation_id');
            $table->unsignedBigInteger('member_id');
            $table->unsignedBigInteger('book_id');
            $table->integer('position');
            $table->string('status', 30)->default('waiting'); // waiting, completed, cancelled
            $table->timestamps();

            $table->foreign('member_id')->references('member_id')->on('members')->cascadeOnDelete();
            $table->foreign('book_id')->references('book_id')->on('books')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
