<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BlogPost extends Model
{
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::saved(function (BlogPost $blogPost) {
            app(\App\Services\BlogTranslationService::class)->clearCache($blogPost->id);
        });

        static::deleted(function (BlogPost $blogPost) {
            app(\App\Services\BlogTranslationService::class)->clearCache($blogPost->id);
        });
    }

    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'content',
        'cover_image',
        'cover_public_id',
        'category',
        'status',
        'is_pinned',
        'author_id',
        'author_type',
        'views',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'views' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function author(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function scopePinned($query)
    {
        return $query->where('is_pinned', true);
    }
}
