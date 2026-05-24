<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

class DigitalDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $openUrl = URL::temporarySignedRoute(
            'digital-documents.download',
            now()->addMinutes(30),
            ['book' => $this->book_id, 'disposition' => 'inline'],
        );
        $downloadUrl = URL::temporarySignedRoute(
            'digital-documents.download',
            now()->addMinutes(30),
            ['book' => $this->book_id, 'disposition' => 'attachment'],
        );

        return [
            'book_id' => $this->book_id,
            'title' => $this->title,
            'author' => $this->author,
            'genre' => $this->genre,
            'resource_type' => $this->resource_type,
            'file_format' => $this->file_format,
            'file_size' => $this->file_size,
            'open_url' => $openUrl,
            'download_url' => $downloadUrl,
            'has_attached_file' => filled($this->file_path) || filled($this->file_url),
            'download_count' => $this->download_count,
            'ai_summary' => $this->ai_summary,
            'ai_tags' => $this->ai_tags ?? [],
            'ai_summary_generated_at' => $this->ai_summary_generated_at?->toISOString(),
            'cover' => $this->cover,
            'is_digital' => (bool) $this->is_digital,
            'avg_rating' => (float) round($this->reviews()->avg('rating') ?? 0, 1),
            'reviews_count' => (int) $this->reviews()->count(),
        ];
    }
}
