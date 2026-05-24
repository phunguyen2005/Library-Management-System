<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')
                ->constrained('members', 'member_id')
                ->cascadeOnDelete();
            $table->foreignId('book_id')
                ->constrained('books', 'book_id')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['member_id', 'book_id']);
            $table->index(['member_id', 'created_at']);
            $table->index(['book_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorites');
    }
};
