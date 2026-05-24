<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Borrowing extends Model
{
    use HasFactory;

    protected $table = 'borrowing';

    protected $primaryKey = 'loan_id';

    public $timestamps = false;

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_BORROWED = 'borrowed';
    public const STATUS_RETURNED = 'returned';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_CANCELLED = 'cancelled';

    public static function getStatuses(): array
    {
        return [
            self::STATUS_PENDING,
            self::STATUS_APPROVED,
            self::STATUS_BORROWED,
            self::STATUS_RETURNED,
            self::STATUS_REJECTED,
            self::STATUS_CANCELLED,
        ];
    }

    protected $fillable = [
        'book_id',
        'member_id',
        'librarian_id',
        'status',
        'rejection_reason',
        'rejected_at',
        'borrow_date',
        'due_date',
        'return_date',
    ];

    protected function casts(): array
    {
        return [
            'borrow_date' => 'date',
            'due_date' => 'date',
            'return_date' => 'date',
            'rejected_at' => 'datetime',
        ];
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class, 'book_id', 'book_id')->withTrashed();
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id', 'member_id');
    }

    public function librarian(): BelongsTo
    {
        return $this->belongsTo(Librarian::class, 'librarian_id', 'librarian_id');
    }

    public function review()
    {
        return $this->hasOne(Review::class, 'loan_id', 'loan_id');
    }

    public function fine()
    {
        return $this->hasOne(Fine::class, 'loan_id', 'loan_id');
    }
}
