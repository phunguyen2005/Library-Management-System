<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('digital_document_accesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_id')->constrained('books', 'book_id')->cascadeOnDelete();
            $table->foreignId('member_id')->nullable()->constrained('members', 'member_id')->nullOnDelete();
            $table->foreignId('librarian_id')->nullable()->constrained('librarians', 'librarian_id')->nullOnDelete();
            $table->string('access_type', 20)->default('download');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('accessed_at')->useCurrent();
            $table->timestamps();

            $table->index(['book_id', 'access_type']);
            $table->index(['member_id', 'access_type']);
            $table->index(['librarian_id', 'access_type']);
            $table->index('accessed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('digital_document_accesses');
    }
};
