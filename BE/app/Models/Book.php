<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Book extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'books';

    protected $primaryKey = 'book_id';

    public $timestamps = false;

    protected $fillable = [
        'title',
        'author',
        'genre',
        'published_year',
        'is_available',
        'cover',
        'location',
        'is_digital',
        'resource_type',
        'file_format',
        'file_size',
        'file_path',
        'file_url',
        'ai_summary',
        'ai_tags',
        'ai_summary_generated_at',
        'download_count',
        'total_quantity',
        'available_quantity',
    ];

    protected function casts(): array
    {
        return [
            'is_available' => 'boolean',
            'is_digital' => 'boolean',
            'published_year' => 'integer',
            'download_count' => 'integer',
            'total_quantity' => 'integer',
            'available_quantity' => 'integer',
            'ai_tags' => 'array',
            'ai_summary_generated_at' => 'datetime',
        ];
    }

    public function borrowings(): HasMany
    {
        return $this->hasMany(Borrowing::class, 'book_id', 'book_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'book_id', 'book_id');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'book_id', 'book_id');
    }

    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(
            Member::class,
            'favorites',
            'book_id',
            'member_id',
            'book_id',
            'member_id',
        )->withTimestamps();
    }

    public function readingProgress(): HasMany
    {
        return $this->hasMany(ReadingProgress::class, 'book_id', 'book_id');
    }
}
