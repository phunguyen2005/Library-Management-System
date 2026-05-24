<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->text('ai_summary')->nullable()->after('file_url');
            $table->json('ai_tags')->nullable()->after('ai_summary');
            $table->timestamp('ai_summary_generated_at')->nullable()->after('ai_tags');
            $table->index('ai_summary_generated_at');
        });
    }

    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropIndex(['ai_summary_generated_at']);
            $table->dropColumn(['ai_summary', 'ai_tags', 'ai_summary_generated_at']);
        });
    }
};
