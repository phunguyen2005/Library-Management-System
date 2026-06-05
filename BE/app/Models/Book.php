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
        'isbn',
        'genre',
        'published_year',
        'is_available',
        'cover',
        'cover_public_id',
        'location',
        'is_digital',
        'resource_type',
        'file_format',
        'file_size',
        'file_path',
        'file_url',
        'file_content',
        'cloudinary_public_id',
        'ai_summary',
        'ai_tags',
        'ai_summary_generated_at',
        'download_count',
        'total_quantity',
        'available_quantity',
        'repairing_quantity',
    ];

    // Exclude binary file content from JSON responses to avoid huge payloads
    protected $hidden = ['file_content'];

    protected function casts(): array
    {
        return [
            'is_available' => 'boolean',
            'is_digital' => 'boolean',
            'published_year' => 'integer',
            'download_count' => 'integer',
            'total_quantity' => 'integer',
            'available_quantity' => 'integer',
            'repairing_quantity' => 'integer',
            'ai_tags' => 'array',
            'ai_summary_generated_at' => 'datetime',
        ];
    }

    public function borrowings(): HasMany
    {
        return $this->hasMany(Borrowing::class, 'book_id', 'book_id');
    }

    public function copies(): HasMany
    {
        return $this->hasMany(BookCopy::class, 'book_id', 'book_id');
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

    public function digitalDocumentAccesses(): HasMany
    {
        return $this->hasMany(DigitalDocumentAccess::class, 'book_id', 'book_id');
    }

    public function digitalDownloads(): HasMany
    {
        return $this->digitalDocumentAccesses()
            ->where('access_type', DigitalDocumentAccess::TYPE_DOWNLOAD);
    }

    public function realDownloadCount(): int
    {
        if (! $this->is_digital) {
            return 0;
        }

        if (array_key_exists('digital_downloads_count', $this->getAttributes())) {
            return (int) $this->getAttribute('digital_downloads_count');
        }

        return (int) $this->digitalDownloads()->count();
    }

    protected static function booted(): void
    {
        static::created(function (Book $book): void {
            if ($book->is_digital) {
                return;
            }

            BookCopy::createCopiesForBook($book, max(0, (int) $book->total_quantity));
        });
    }
}
