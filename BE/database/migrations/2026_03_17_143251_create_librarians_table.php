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
        Schema::create('librarians', function (Blueprint $table) {
            $table->id('librarian_id');
            $table->string('name');
            $table->string('email')->nullable()->unique();
            $table->text('phone_number')->nullable();
            $table->date('hire_date')->default(\Illuminate\Support\Facades\DB::raw('(CURRENT_DATE)'));
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('librarians');
    }
};
