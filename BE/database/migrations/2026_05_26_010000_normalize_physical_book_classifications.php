<?php

use App\Support\BookClassification;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('books')
            ->where('is_digital', false)
            ->orderBy('book_id')
            ->select(['book_id', 'genre', 'location'])
            ->chunkById(100, function ($books): void {
                foreach ($books as $book) {
                    $normalized = BookClassification::normalizePhysical($book->genre, $book->location)
                        ?? BookClassification::normalizePhysical(BookClassification::FALLBACK_GENRE, null);

                    DB::table('books')
                        ->where('book_id', $book->book_id)
                        ->update([
                            'genre' => $normalized['genre'],
                            'location' => $normalized['location'],
                        ]);
                }
            }, 'book_id');
    }

    public function down(): void
    {
        // Data normalization cannot be reversed safely without the original free-text values.
    }
};
