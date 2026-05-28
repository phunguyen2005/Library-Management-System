<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookCopy extends Model
{
    protected $table = 'book_copies';

    public $timestamps = false;

    public const STATUS_AVAILABLE = 'available';
    public const STATUS_BORROWED = 'borrowed';
    public const STATUS_DAMAGED = 'damaged';
    public const STATUS_LOST = 'lost';
    public const STATUS_REPAIRING = 'repairing';

    public const CONDITION_GOOD = 'good';
    public const CONDITION_DAMAGED = 'damaged';
    public const CONDITION_LOST = 'lost';

    protected $fillable = [
        'book_id',
        'barcode',
        'status',
        'condition',
        'added_at',
        'last_checked_out_at',
        'last_checked_in_at',
    ];

    protected function casts(): array
    {
        return [
            'added_at' => 'datetime',
            'last_checked_out_at' => 'datetime',
            'last_checked_in_at' => 'datetime',
        ];
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class, 'book_id', 'book_id');
    }

    public function borrowings(): HasMany
    {
        return $this->hasMany(Borrowing::class, 'copy_id', 'id');
    }

    public static function statuses(): array
    {
        return [
            self::STATUS_AVAILABLE,
            self::STATUS_BORROWED,
            self::STATUS_DAMAGED,
            self::STATUS_LOST,
            self::STATUS_REPAIRING,
        ];
    }

    public static function conditions(): array
    {
        return [
            self::CONDITION_GOOD,
            self::CONDITION_DAMAGED,
            self::CONDITION_LOST,
        ];
    }

    public static function generateBarcode(Book $book, ?int $sequence = null): string
    {
        $nextSequence = $sequence ?? ($book->copies()->count() + 1);

        do {
            $barcode = 'BC-SACH-'.$book->book_id.'-'.str_pad((string) $nextSequence, 2, '0', STR_PAD_LEFT);
            $nextSequence++;
        } while (self::query()->where('barcode', $barcode)->exists());

        return $barcode;
    }

    public static function createCopiesForBook(Book $book, int $quantity): void
    {
        if ($quantity <= 0 || $book->is_digital) {
            return;
        }

        $startingSequence = $book->copies()->count() + 1;

        for ($index = 0; $index < $quantity; $index++) {
            self::query()->create([
                'book_id' => $book->book_id,
                'barcode' => self::generateBarcode($book, $startingSequence + $index),
                'status' => self::STATUS_AVAILABLE,
                'condition' => self::CONDITION_GOOD,
                'added_at' => now(),
            ]);
        }

        self::syncBookCounters($book);
    }

    public static function syncBookCounters(Book $book): void
    {
        if ($book->is_digital) {
            $book->forceFill([
                'total_quantity' => 0,
                'available_quantity' => 0,
                'repairing_quantity' => 0,
                'is_available' => false,
            ])->save();

            return;
        }

        $total = $book->copies()
            ->where('status', '!=', self::STATUS_LOST)
            ->count();
        $availableCopies = $book->copies()
            ->where('status', self::STATUS_AVAILABLE)
            ->count();
        $approvedHolds = $book->borrowings()
            ->where('status', Borrowing::STATUS_APPROVED)
            ->whereNull('copy_id')
            ->count();
        $repairing = $book->copies()
            ->where('status', self::STATUS_REPAIRING)
            ->count();
        $available = max(0, $availableCopies - $approvedHolds);

        $book->forceFill([
            'total_quantity' => $total,
            'available_quantity' => $available,
            'repairing_quantity' => $repairing,
            'is_available' => $available > 0,
        ])->save();
    }
}
