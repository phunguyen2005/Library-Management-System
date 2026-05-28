<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BlogAiExcerptService
{
    public function generate(string $title, string $htmlContent): string
    {
        $plainText = $this->plainText($htmlContent);
        $apiKey = $this->apiKey();

        if ($apiKey !== null && $plainText !== '') {
            try {
                $excerpt = $this->generateWithGemini($title, $plainText, $apiKey);

                if ($excerpt !== null) {
                    return $excerpt;
                }
            } catch (\Throwable $exception) {
                Log::warning('Blog AI excerpt generation failed: '.$exception->getMessage());
            }
        }

        return $this->fallbackExcerpt($title, $plainText);
    }

    private function apiKey(): ?string
    {
        $key = (string) (config('services.gemini.api_key') ?: env('GEMINI_API_KEY'));

        if ($key === '' || $key === 'MY_GEMINI_API_KEY') {
            return null;
        }

        return $key;
    }

    private function generateWithGemini(string $title, string $plainText, string $apiKey): ?string
    {
        $prompt = implode("\n", [
            'Write a concise Vietnamese excerpt for this HCMUE Library blog post.',
            'Return only plain text, 1 to 2 sentences, maximum 220 characters.',
            '',
            'Title: '.$title,
            'Content: '.Str::limit($plainText, 5000, ''),
        ]);

        $model = env('GEMINI_MODEL', 'gemini-1.5-flash');
        $response = Http::timeout(12)->post(
            "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
            [
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $prompt]]],
                ],
                'generationConfig' => [
                    'temperature' => 0.35,
                    'maxOutputTokens' => 160,
                ],
            ],
        );

        if (! $response->successful()) {
            return null;
        }

        $excerpt = trim((string) $response->json('candidates.0.content.parts.0.text', ''));
        $excerpt = preg_replace('/^```(?:text)?\s*|\s*```$/', '', $excerpt) ?: $excerpt;
        $excerpt = trim(strip_tags($excerpt));

        return $excerpt === '' ? null : Str::limit($excerpt, 240, '');
    }

    private function fallbackExcerpt(string $title, string $plainText): string
    {
        $source = trim($plainText) !== '' ? $plainText : $title;

        return Str::limit($source, 220, '');
    }

    private function plainText(string $htmlContent): string
    {
        return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($htmlContent), ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? '');
    }
}
