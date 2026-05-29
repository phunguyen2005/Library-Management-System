<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('books', function (Blueprint $table) {
            // Store PDF binary content directly in TiDB (LONGBLOB)
            // This avoids ephemeral filesystem issues on Render
            $table->binary('file_content')->nullable()->after('file_url');
        });
    }

    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropColumn('file_content');
        });
    }
};
