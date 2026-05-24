<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinePayment extends Model
{
    use HasFactory;

    protected $table = 'fine_payments';
    protected $primaryKey = 'payment_id';

    public const METHOD_CASH = 'cash';
    public const METHOD_MOMO = 'momo';
    public const METHOD_VNPAY = 'vnpay';
    public const METHOD_TRANSFER = 'transfer';

    public const STATUS_PENDING = 'pending';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_REFUNDED = 'refunded';

    protected $fillable = [
        'fine_id',
        'amount_paid',
        'method',
        'transaction_ref',
        'status',
        'collected_by',
        'gateway_response',
    ];

    protected $casts = [
        'amount_paid' => 'decimal:2',
        'gateway_response' => 'array',
    ];

    public function fine(): BelongsTo
    {
        return $this->belongsTo(Fine::class, 'fine_id', 'fine_id');
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(Librarian::class, 'collected_by', 'librarian_id');
    }
}
