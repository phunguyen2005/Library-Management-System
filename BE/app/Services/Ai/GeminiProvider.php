<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class GeminiProvider implements AiProviderInterface
{
    protected ?string $apiKey;
    protected string $model;

    public function __construct()
    {
        $key = config('services.gemini.api_key');
        $this->apiKey = (empty($key) || $key === 'MY_GEMINI_API_KEY') ? null : $key;
        $this->model = config('services.gemini.model', 'gemini-1.5-flash');
    }

    public function generate(string $prompt, array $history = [], ?string $systemInstruction = null, array $options = []): string
    {
        if (!$this->apiKey) {
            throw new Exception("Gemini API key is not configured.");
        }

        $contents = $this->mapHistory($history, $prompt);

        $payload = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => $options['temperature'] ?? 0.7,
                'maxOutputTokens' => $options['maxOutputTokens'] ?? 1000,
            ]
        ];

        if ($systemInstruction) {
            $payload['systemInstruction'] = [
                'parts' => [['text' => $systemInstruction]]
            ];
        }

        $response = Http::timeout($options['timeout'] ?? 15)->post(
            "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}",
            $payload
        );

        if (!$response->successful()) {
            Log::error('Gemini API Error: ' . $response->body());
            throw new Exception("Gemini API returned error: " . $response->status());
        }

        $text = $response->json('candidates.0.content.parts.0.text');
        if (empty($text)) {
            throw new Exception("Gemini API returned an empty response.");
        }

        return $text;
    }

    public function stream(
        string $prompt,
        array $history = [],
        ?string $systemInstruction = null,
        array $tools = [],
        ?callable $onToolCall = null,
        callable $onChunk = null,
        array $options = []
    ): void {
        if (!$this->apiKey) {
            throw new Exception("Gemini API key is not configured.");
        }

        $contents = $this->mapHistory($history, $prompt);

        // Handle tool calls recursively if tools are provided
        if (!empty($tools) && $onToolCall) {
            $contents = $this->resolveFunctionCalls($contents, $systemInstruction, $tools, $onToolCall);
            if (isset($contents['error'])) {
                throw new Exception("Gemini Function Calling Error: " . $contents['error']);
            }
        }

        $postData = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => $options['temperature'] ?? 0.5,
                'maxOutputTokens' => $options['maxOutputTokens'] ?? 1000,
            ]
        ];

        if ($systemInstruction) {
            $postData['systemInstruction'] = [
                'parts' => [['text' => $systemInstruction]]
            ];
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:streamGenerateContent?alt=sse&key={$this->apiKey}");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        
        $isError = false;
        $errorBuffer = '';
        $firstChunkChecked = false;

        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $data) use (&$isError, &$errorBuffer, &$firstChunkChecked, $onChunk) {
            if (!$firstChunkChecked) {
                $firstChunkChecked = true;
                $trimmed = trim($data);
                if (strpos($trimmed, '{') === 0) {
                    $decoded = json_decode($trimmed, true);
                    if (is_array($decoded) && isset($decoded['error'])) {
                        $isError = true;
                        $errorBuffer .= $data;
                        return strlen($data);
                    }
                }
            }

            if ($isError) {
                $errorBuffer .= $data;
                return strlen($data);
            }

            // Stream standard SSE chunk
            $onChunk($data);
            return strlen($data);
        });

        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($isError || $httpCode !== 200 || $res === false) {
            $errDetail = $errorBuffer ?: "cURL execution failed, HTTP {$httpCode}";
            Log::error("Gemini SSE API stream failed. HTTP Code: {$httpCode}, Raw Error: " . $errDetail);
            throw new Exception("Gemini Stream failed: " . $errDetail);
        }
    }

    protected function mapHistory(array $history, string $prompt): array
    {
        $contents = [];
        foreach ($history as $chatItem) {
            if (empty($chatItem['text']) || trim($chatItem['text']) === '') {
                continue;
            }
            $role = ($chatItem['sender'] === 'user' || $chatItem['sender'] === 'model') ? $chatItem['sender'] : 'model';
            if ($role === 'ai') {
                $role = 'model';
            }
            $contents[] = [
                'role' => $role,
                'parts' => [['text' => $chatItem['text']]]
            ];
        }

        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $prompt]]
        ];

        return $contents;
    }

    protected function resolveFunctionCalls(array $contents, ?string $systemInstruction, array $tools, callable $onToolCall): array
    {
        for ($i = 0; $i < 5; $i++) {
            $payload = [
                'contents' => $contents,
                'tools' => $tools,
                'generationConfig' => [
                    'temperature' => 0.5,
                ]
            ];

            if ($systemInstruction) {
                $payload['systemInstruction'] = [
                    'parts' => [['text' => $systemInstruction]]
                ];
            }

            $response = Http::post("https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}", $payload);

            if (!$response->successful()) {
                return ['error' => 'API call failed: ' . $response->body()];
            }

            $candidate = $response->json('candidates.0');
            $parts = $candidate['content']['parts'] ?? [];

            $hasFunctionCall = false;
            $functionCalls = [];
            foreach ($parts as $part) {
                if (isset($part['functionCall'])) {
                    $hasFunctionCall = true;
                    $functionCalls[] = $part['functionCall'];
                }
            }

            if (!$hasFunctionCall) {
                return $contents;
            }

            $contents[] = $candidate['content'];

            $toolParts = [];
            foreach ($functionCalls as $call) {
                $name = $call['name'];
                $args = $call['args'] ?? [];
                
                try {
                    $result = $onToolCall($name, $args);
                } catch (Exception $ex) {
                    Log::error("Gemini function call resolution $name failed: " . $ex->getMessage());
                    $result = ['error' => $ex->getMessage()];
                }

                $toolParts[] = [
                    'functionResponse' => [
                        'name' => $name,
                        'response' => [
                            'output' => $result
                        ]
                    ]
                ];
            }

            $contents[] = [
                'role' => 'tool',
                'parts' => $toolParts
            ];
        }

        return ['error' => 'Exceeded maximum recursive tool calls'];
    }
}
