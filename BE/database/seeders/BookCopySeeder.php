<?php

namespace Database\Seeders;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Borrowing;
use Illuminate\Database\Seeder;

class BookCopySeeder extends Seeder
{
    public function run(): void
    {
        Book::query()
            ->where('is_digital', false)
            ->orderBy('book_id')
            ->chunkById(100, function ($books): void {
                foreach ($books as $book) {
                    $targetTotal = max(0, (int) $book->total_quantity);
                    $existingCopies = $book->copies()->count();

                    if ($existingCopies < $targetTotal) {
                        BookCopy::createCopiesForBook($book, $targetTotal - $existingCopies);
                    }

                    $this->assignBorrowedLoans($book);
                    BookCopy::syncBookCounters($book->fresh());
                }
            }, 'book_id');
    }

    private function assignBorrowedLoans(Book $book): void
    {
        $book->borrowings()
            ->where('status', Borrowing::STATUS_BORROWED)
            ->whereNull('copy_id')
            ->orderBy('loan_id')
            ->each(function (Borrowing $loan) use ($book): void {
                $copy = $book->copies()
                    ->where('status', BookCopy::STATUS_AVAILABLE)
                    ->orderBy('id')
                    ->first();

                if (! $copy) {
                    $copy = BookCopy::query()->create([
                        'book_id' => $book->book_id,
                        'barcode' => BookCopy::generateBarcode($book),
                        'status' => BookCopy::STATUS_AVAILABLE,
                        'condition' => BookCopy::CONDITION_GOOD,
                        'added_at' => now(),
                    ]);
                }

                $copy->forceFill([
                    'status' => BookCopy::STATUS_BORROWED,
                    'condition' => BookCopy::CONDITION_GOOD,
                    'last_checked_out_at' => $loan->borrow_date ?? now(),
                ])->save();

                $loan->forceFill(['copy_id' => $copy->id])->save();
            });
    }
}
