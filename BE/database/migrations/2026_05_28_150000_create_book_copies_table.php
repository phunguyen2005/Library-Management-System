<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('book_copies', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('book_id');
            $table->string('barcode')->unique();
            $table->string('status', 30)->default('available')->index();
            $table->string('condition', 30)->default('good')->index();
            $table->timestamp('added_at')->useCurrent();
            $table->timestamp('last_checked_out_at')->nullable();
            $table->timestamp('last_checked_in_at')->nullable();

            $table->foreign('book_id')->references('book_id')->on('books')->cascadeOnDelete();
            $table->index(['book_id', 'status']);
        });

        Schema::table('borrowing', function (Blueprint $table) {
            $table->unsignedBigInteger('copy_id')->nullable()->after('book_id')->index();
        });

        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('borrowing', function (Blueprint $table) {
                $table->foreign('copy_id')->references('id')->on('book_copies')->nullOnDelete();
            });
        }

        $this->backfillExistingPhysicalCopies();
    }

    public function down(): void
    {
        if (Schema::hasColumn('borrowing', 'copy_id')) {
            if (DB::getDriverName() !== 'sqlite') {
                Schema::table('borrowing', function (Blueprint $table) {
                    $table->dropForeign(['copy_id']);
                });
            }

            Schema::table('borrowing', function (Blueprint $table) {
                $table->dropColumn('copy_id');
            });
        }

        Schema::dropIfExists('book_copies');
    }

    private function backfillExistingPhysicalCopies(): void
    {
        DB::table('books')
            ->where(function ($query) {
                $query->where('is_digital', false)->orWhereNull('is_digital');
            })
            ->orderBy('book_id')
            ->chunkById(100, function ($books): void {
                foreach ($books as $book) {
                    $this->ensureCopiesForBook((int) $book->book_id, max(0, (int) ($book->total_quantity ?? 0)));
                    $this->assignBorrowedLoansToCopies((int) $book->book_id);
                    $this->syncBookCounters((int) $book->book_id);
                }
            }, 'book_id');
    }

    private function ensureCopiesForBook(int $bookId, int $targetTotal): void
    {
        $existing = DB::table('book_copies')->where('book_id', $bookId)->count();

        for ($sequence = $existing + 1; $sequence <= $targetTotal; $sequence++) {
            DB::table('book_copies')->insert([
                'book_id' => $bookId,
                'barcode' => $this->barcodeFor($bookId, $sequence),
                'status' => 'available',
                'condition' => 'good',
                'added_at' => now(),
            ]);
        }
    }

    private function assignBorrowedLoansToCopies(int $bookId): void
    {
        $loans = DB::table('borrowing')
            ->where('book_id', $bookId)
            ->where('status', 'borrowed')
            ->whereNull('copy_id')
            ->orderBy('loan_id')
            ->get(['loan_id']);

        foreach ($loans as $loan) {
            $copy = DB::table('book_copies')
                ->where('book_id', $bookId)
                ->where('status', 'available')
                ->orderBy('id')
                ->first(['id']);

            if (! $copy) {
                $nextSequence = DB::table('book_copies')->where('book_id', $bookId)->count() + 1;
                $copyId = DB::table('book_copies')->insertGetId([
                    'book_id' => $bookId,
                    'barcode' => $this->barcodeFor($bookId, $nextSequence),
                    'status' => 'borrowed',
                    'condition' => 'good',
                    'added_at' => now(),
                    'last_checked_out_at' => now(),
                ]);
            } else {
                $copyId = (int) $copy->id;
                DB::table('book_copies')
                    ->where('id', $copyId)
                    ->update([
                        'status' => 'borrowed',
                        'condition' => 'good',
                        'last_checked_out_at' => now(),
                    ]);
            }

            DB::table('borrowing')
                ->where('loan_id', $loan->loan_id)
                ->update(['copy_id' => $copyId]);
        }
    }

    private function syncBookCounters(int $bookId): void
    {
        $total = DB::table('book_copies')
            ->where('book_id', $bookId)
            ->where('status', '!=', 'lost')
            ->count();
        $availableCopies = DB::table('book_copies')
            ->where('book_id', $bookId)
            ->where('status', 'available')
            ->count();
        $approvedHolds = DB::table('borrowing')
            ->where('book_id', $bookId)
            ->where('status', 'approved')
            ->whereNull('copy_id')
            ->count();
        $repairing = DB::table('book_copies')
            ->where('book_id', $bookId)
            ->where('status', 'repairing')
            ->count();
        $available = max(0, $availableCopies - $approvedHolds);

        DB::table('books')
            ->where('book_id', $bookId)
            ->update([
                'total_quantity' => $total,
                'available_quantity' => $available,
                'repairing_quantity' => $repairing,
                'is_available' => $available > 0,
            ]);
    }

    private function barcodeFor(int $bookId, int $sequence): string
    {
        return 'BC-SACH-'.$bookId.'-'.str_pad((string) $sequence, 2, '0', STR_PAD_LEFT);
    }
};
