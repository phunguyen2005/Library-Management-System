<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $indexes = [
        'borrowing' => [
            ['columns' => ['member_id', 'status'], 'name' => 'perf_borrowing_member_status_idx'],
        ],
        'reservations' => [
            ['columns' => ['member_id', 'book_id', 'status'], 'name' => 'perf_reservations_member_book_status_idx'],
            ['columns' => ['book_id', 'status'], 'name' => 'perf_reservations_book_status_idx'],
        ],
        'room_bookings' => [
            ['columns' => ['member_id', 'date', 'status'], 'name' => 'perf_room_bookings_member_date_status_idx'],
            ['columns' => ['room_id', 'date', 'status'], 'name' => 'perf_room_bookings_room_date_status_idx'],
        ],
        'reviews' => [
            ['columns' => ['book_id'], 'name' => 'perf_reviews_book_idx'],
        ],
    ];

    public function up(): void
    {
        foreach ($this->indexes as $tableName => $definitions) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName, $definitions) {
                foreach ($definitions as $definition) {
                    if (! Schema::hasIndex($tableName, $definition['columns'])) {
                        $table->index($definition['columns'], $definition['name']);
                    }
                }
            });
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as $tableName => $definitions) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName, $definitions) {
                foreach ($definitions as $definition) {
                    if (Schema::hasIndex($tableName, $definition['name'])) {
                        $table->dropIndex($definition['name']);
                    }
                }
            });
        }
    }
};
