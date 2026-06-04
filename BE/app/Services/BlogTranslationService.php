<?php

namespace App\Services;

use App\Models\BlogPost;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BlogTranslationService
{
    private function apiKey(): ?string
    {
        $key = (string) config('services.gemini.api_key');

        if ($key === '' || $key === 'MY_GEMINI_API_KEY') {
            return null;
        }

        return $key;
    }

    public function translate(BlogPost $post, string $locale): array
    {
        // 'vi' is the source/database language, so no translation is needed
        if ($locale === 'vi') {
            return [
                'title' => $post->title,
                'excerpt' => $post->excerpt,
                'content' => $post->content,
            ];
        }

        $cacheKey = "blog_post_translation:{$post->id}:{$locale}";

        return Cache::remember($cacheKey, 86400 * 7, function () use ($post, $locale) {
            $apiKey = $this->apiKey();
            if (!$apiKey) {
                return [
                    'title' => $post->title,
                    'excerpt' => $post->excerpt,
                    'content' => $post->content,
                ];
            }

            try {
                return $this->translateWithGemini($post->title, $post->excerpt ?? '', $post->content, $locale, $apiKey);
            } catch (\Throwable $exception) {
                Log::warning("Blog translation failed for post {$post->id} to {$locale}: " . $exception->getMessage());
                return [
                    'title' => $post->title,
                    'excerpt' => $post->excerpt,
                    'content' => $post->content,
                ];
            }
        });
    }

    private function translateWithGemini(string $title, string $excerpt, string $content, string $locale, string $apiKey): array
    {
        $languageName = $this->getLanguageName($locale);

        $prompt = implode("\n", [
            "You are a professional translator for HCMUE Library.",
            "Translate the following blog post title, excerpt, and content into {$languageName}.",
            "CRITICAL INSTRUCTIONS:",
            "1. Output your response as a valid JSON object ONLY. Do not include markdown code block formatting or backticks.",
            "2. Keep all HTML tags (like <p>, <strong>, <a>, etc.) and attributes in the content exactly intact. Only translate the text within the HTML tags.",
            "3. The JSON object MUST have exactly these keys: title, excerpt, and content.",
            "",
            "Title to translate: {$title}",
            "Excerpt to translate: {$excerpt}",
            "Content (HTML) to translate: {$content}",
        ]);

        $model = config('services.gemini.model', 'gemini-1.5-flash');
        $response = Http::timeout(25)->post(
            "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
            [
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $prompt]]],
                ],
                'generationConfig' => [
                    'temperature' => 0.2,
                    'maxOutputTokens' => 4000,
                    'responseMimeType' => 'application/json',
                ],
            ],
        );

        if (!$response->successful()) {
            throw new \Exception("Gemini returned status " . $response->status() . ": " . $response->body());
        }

        $rawText = trim((string) $response->json('candidates.0.content.parts.0.text', ''));
        $decoded = json_decode($rawText, true);

        if (!is_array($decoded) || !isset($decoded['title']) || !isset($decoded['content'])) {
            // Try extracting from json block if MIME type enforcement failed
            $rawTextClean = preg_replace('/^```(?:json)?\s*|\s*```$/', '', $rawText) ?: $rawText;
            $decoded = json_decode($rawTextClean, true);
            if (!is_array($decoded) || !isset($decoded['title']) || !isset($decoded['content'])) {
                throw new \Exception("Invalid JSON response from Gemini: " . $rawText);
            }
        }

        return [
            'title' => trim((string) $decoded['title']),
            'excerpt' => trim((string) ($decoded['excerpt'] ?? '')),
            'content' => trim((string) $decoded['content']),
        ];
    }

    private function getLanguageName(string $locale): string
    {
        return match ($locale) {
            'en' => 'English',
            'zh' => 'Simplified Chinese',
            'ja' => 'Japanese',
            'ko' => 'Korean',
            default => 'English',
        };
    }

    public function clearCache(int $postId): void
    {
        foreach (['en', 'zh', 'ja', 'ko'] as $locale) {
            Cache::forget("blog_post_translation:{$postId}:{$locale}");
        }
    }
}
