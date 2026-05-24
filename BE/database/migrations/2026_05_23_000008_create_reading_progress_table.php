<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reading_progress', function (Blueprint $table) {
            $table->id('progress_id');
            $table->foreignId('member_id')->constrained('members', 'member_id')->cascadeOnDelete();
            $table->foreignId('book_id')->constrained('books', 'book_id')->cascadeOnDelete();
            $table->unsignedInteger('current_page')->default(1);
            $table->unsignedInteger('total_pages')->default(1);
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();
            $table->unique(['member_id', 'book_id']);
            $table->index(['member_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reading_progress');
    }
};
