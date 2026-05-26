<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalDocumentAccess extends Model
{
    public const TYPE_PREVIEW = 'preview';
    public const TYPE_DOWNLOAD = 'download';

    protected $fillable = [
        'book_id',
        'member_id',
        'librarian_id',
        'access_type',
        'ip_address',
        'user_agent',
        'accessed_at',
    ];

    protected function casts(): array
    {
        return [
            'accessed_at' => 'datetime',
        ];
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class, 'book_id', 'book_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id', 'member_id');
    }

    public function librarian(): BelongsTo
    {
        return $this->belongsTo(Librarian::class, 'librarian_id', 'librarian_id');
    }
}
