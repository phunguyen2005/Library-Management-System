<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('library_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('loan_period_days')->default(14);
            $table->unsignedSmallInteger('max_active_loans')->default(5);
            $table->timestamps();
        });

        DB::table('library_settings')->updateOrInsert(
            ['id' => 1],
            [
                'loan_period_days' => 14,
                'max_active_loans' => 5,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('library_settings');
    }
};
