<?php

namespace App\Services;

use App\Models\Book;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BookAiMetadataService
{
    public function apply(Book $book): Book
    {
        $metadata = $this->generate($book);

        $book->forceFill([
            'ai_summary' => $metadata['summary'],
            'ai_tags' => $metadata['tags'],
            'ai_summary_generated_at' => now(),
        ])->save();

        return $book->fresh();
    }

    /**
     * @return array{summary:string,tags:array<int,string>}
     */
    public function generate(Book $book): array
    {
        $apiKey = $this->apiKey();

        if ($apiKey !== null) {
            try {
                $metadata = $this->generateWithGemini($book, $apiKey);

                if ($metadata !== null) {
                    return $metadata;
                }
            } catch (\Throwable $exception) {
                Log::warning('Book AI metadata generation failed: '.$exception->getMessage(), [
                    'book_id' => $book->book_id,
                ]);
            }
        }

        return $this->fallbackMetadata($book);
    }

    private function apiKey(): ?string
    {
        $key = (string) (config('services.gemini.api_key') ?: env('GEMINI_API_KEY'));

        if ($key === '' || $key === 'MY_GEMINI_API_KEY') {
            return null;
        }

        return $key;
    }

    /**
     * @return array{summary:string,tags:array<int,string>}|null
     */
    private function generateWithGemini(Book $book, string $apiKey): ?array
    {
        $prompt = implode("\n", [
            'Create library metadata for this book.',
            'Return pure JSON with keys: summary and tags.',
            'summary: 2 concise Vietnamese sentences for students.',
            'tags: 5 to 8 short Vietnamese or English keywords.',
            '',
            'Book:',
            '- Title: '.$book->title,
            '- Author: '.$book->author,
            '- Category: '.($book->genre ?: 'Unknown'),
            '- Resource type: '.($book->resource_type ?: 'Physical book'),
            '- Format: '.($book->file_format ?: 'N/A'),
            '- Digital: '.($book->is_digital ? 'yes' : 'no'),
        ]);

        $model = env('GEMINI_MODEL', 'gemini-2.5-flash');
        $response = Http::timeout(12)->post(
            "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
            [
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $prompt]]],
                ],
                'generationConfig' => [
                    'temperature' => 0.35,
                    'maxOutputTokens' => 450,
                ],
            ],
        );

        if (! $response->successful()) {
            Log::warning('Gemini metadata response was not successful', [
                'book_id' => $book->book_id,
                'status' => $response->status(),
            ]);

            return null;
        }

        $rawText = trim((string) $response->json('candidates.0.content.parts.0.text', ''));
        $rawText = preg_replace('/^```(?:json)?\s*|\s*```$/', '', $rawText) ?: $rawText;
        $decoded = json_decode($rawText, true);

        if (! is_array($decoded)) {
            return null;
        }

        $summary = trim((string) Arr::get($decoded, 'summary', ''));
        $tags = collect(Arr::get($decoded, 'tags', []))
            ->filter(fn ($tag) => is_string($tag) && trim($tag) !== '')
            ->map(fn (string $tag) => Str::limit(trim($tag), 40, ''))
            ->unique()
            ->values()
            ->take(8)
            ->all();

        if ($summary === '' || empty($tags)) {
            return null;
        }

        return [
            'summary' => Str::limit($summary, 1000, ''),
            'tags' => $tags,
        ];
    }

    /**
     * @return array{summary:string,tags:array<int,string>}
     */
    private function fallbackMetadata(Book $book): array
    {
        $category = $book->genre ?: $book->resource_type ?: 'general library';
        $format = $book->is_digital
            ? 'digital '.strtolower((string) ($book->file_format ?: 'resource'))
            : 'print resource';
        $tags = $this->fallbackTags($book);

        return [
            'summary' => sprintf(
                '%s by %s is a %s %s for students who want focused reference material. It is recommended for topics around %s.',
                $book->title,
                $book->author,
                $category,
                $format,
                implode(', ', array_slice($tags, 0, 4)),
            ),
            'tags' => $tags,
        ];
    }

    /**
     * @return array<int,string>
     */
    private function fallbackTags(Book $book): array
    {
        $seedTags = [
            $book->genre,
            $book->resource_type,
            $book->file_format,
            $book->is_digital ? 'digital-library' : 'physical-book',
        ];

        $wordTags = collect([$book->title, $book->author])
            ->filter()
            ->flatMap(fn (string $value) => preg_split('/[\s,;:\/\-_]+/u', Str::ascii($value)) ?: [])
            ->map(fn (string $value) => Str::lower(trim($value)))
            ->filter(fn (string $value) => strlen($value) >= 4 && ! is_numeric($value))
            ->take(6)
            ->all();

        return collect($seedTags)
            ->merge($wordTags)
            ->filter(fn ($tag) => is_string($tag) && trim($tag) !== '')
            ->map(fn (string $tag) => Str::limit(trim($tag), 40, ''))
            ->unique(fn (string $tag) => Str::lower($tag))
            ->values()
            ->take(8)
            ->all();
    }
}
