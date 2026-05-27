<?php

namespace App\Http\Resources;

use App\Models\Librarian;
use App\Models\Member;
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
            $this->signedAccessParameters($request, 'inline'),
        );
        $downloadUrl = URL::temporarySignedRoute(
            'digital-documents.download',
            now()->addMinutes(30),
            $this->signedAccessParameters($request, 'attachment'),
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
            'download_count' => $this->realDownloadCount(),
            'ai_summary' => $this->ai_summary,
            'ai_tags' => $this->ai_tags ?? [],
            'ai_summary_generated_at' => $this->ai_summary_generated_at?->toISOString(),
            'cover' => $this->cover,
            'is_digital' => (bool) $this->is_digital,
            'avg_rating' => (float) round($this->reviews_avg_rating ?? ($this->reviews()->avg('rating') ?? 0), 1),
            'reviews_count' => (int) ($this->reviews_count ?? $this->reviews()->count()),
        ];
    }

    private function signedAccessParameters(Request $request, string $disposition): array
    {
        $parameters = [
            'book' => $this->book_id,
            'disposition' => $disposition,
        ];

        $user = $request->user();

        if ($user instanceof Member) {
            $parameters['member_id'] = $user->member_id;
        } elseif ($user instanceof Librarian) {
            $parameters['librarian_id'] = $user->librarian_id;
        }

        return $parameters;
    }
}
