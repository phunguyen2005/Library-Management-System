<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('borrowing', function (Blueprint $table) {
            $table->string('status', 50)->default('pending')->change();
        });
    }

    public function down(): void
    {
        Schema::table('borrowing', function (Blueprint $table) {
            // Revert back to enum
            $table->enum('status', ['pending', 'borrowed', 'returned', 'rejected'])->default('pending')->change();
        });
    }
};
