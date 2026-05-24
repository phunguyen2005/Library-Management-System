<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Fine extends Model
{
    use HasFactory;

    protected $table = 'fines';
    protected $primaryKey = 'fine_id';

    public const REASON_OVERDUE = 'overdue';
    public const REASON_DAMAGED = 'damaged';
    public const REASON_LOST = 'lost';

    public const STATUS_UNPAID = 'unpaid';
    public const STATUS_PAID = 'paid';
    public const STATUS_WAIVED = 'waived';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'loan_id',
        'member_id',
        'amount',
        'reason',
        'status',
        'paid_at',
        'waived_by',
        'waived_reason',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function borrowing(): BelongsTo
    {
        return $this->belongsTo(Borrowing::class, 'loan_id', 'loan_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id', 'member_id');
    }

    public function waivedBy(): BelongsTo
    {
        return $this->belongsTo(Librarian::class, 'waived_by', 'librarian_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(FinePayment::class, 'fine_id', 'fine_id');
    }
}
