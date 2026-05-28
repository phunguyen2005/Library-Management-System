<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isAudio = strtoupper((string) $this->file_format) === 'AUDIO';

        return [
            'book_id' => $this->book_id,
            'title' => $this->title,
            'author' => $this->author,
            'genre' => $this->genre,
            'published_year' => $this->published_year,
            'cover' => $this->cover ? (filter_var($this->cover, FILTER_VALIDATE_URL) ? $this->cover : asset($this->cover)) : null,
            'location' => $this->location,
            'is_digital' => (bool) $this->is_digital,
            'resource_type' => $this->resource_type,
            'file_format' => $this->file_format,
            'file_size' => $this->file_size,
            'file_url' => $this->file_url,
            'has_digital_file' => filled($this->file_path) || filled($this->file_url),
            'digital_file_name' => $this->file_path ? basename($this->file_path) : ($this->file_url ? basename($this->file_url) : null),
            'ai_summary' => $isAudio ? null : $this->ai_summary,
            'ai_tags' => $isAudio ? [] : ($this->ai_tags ?? []),
            'ai_summary_generated_at' => $isAudio ? null : $this->ai_summary_generated_at?->toISOString(),
            'download_count' => $this->realDownloadCount(),
            'total_quantity' => $this->total_quantity,
            'available_quantity' => $this->available_quantity,
            'repairing_quantity' => (int) ($this->repairing_quantity ?? 0),
            'is_available' => (bool) $this->is_available,
            'copies' => BookCopyResource::collection($this->whenLoaded('copies')),
            'favorite_count' => (int) ($this->favorite_count ?? $this->favoritedBy()->count()),
            'is_favorite' => (bool) ($this->is_favorite ?? false),
            'avg_rating' => (float) round($this->reviews_avg_rating ?? ($this->reviews()->avg('rating') ?? 0), 1),
            'reviews_count' => (int) ($this->reviews_count ?? $this->reviews()->count()),
        ];
    }
}
