<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReadingProgress extends Model
{
    use HasFactory;

    protected $table = 'reading_progress';

    protected $primaryKey = 'progress_id';

    protected $fillable = [
        'member_id',
        'book_id',
        'current_page',
        'total_pages',
        'last_read_at',
    ];

    protected function casts(): array
    {
        return [
            'current_page' => 'integer',
            'total_pages' => 'integer',
            'last_read_at' => 'datetime',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id', 'member_id');
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class, 'book_id', 'book_id');
    }

    public function progressPercent(): float
    {
        if ($this->total_pages <= 0) {
            return 0.0;
        }

        return round(min(100, ($this->current_page / $this->total_pages) * 100), 1);
    }
}
