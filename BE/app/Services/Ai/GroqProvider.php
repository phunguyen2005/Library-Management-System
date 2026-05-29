<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class GroqProvider implements AiProviderInterface
{
    protected ?string $apiKey;
    protected string $model;

    public function __construct()
    {
        $key = config('services.groq.api_key');
        $this->apiKey = (empty($key) || $key === 'MY_GROQ_API_KEY') ? null : $key;
        // Default to llama3-8b-8192 for fast response or llama3-70b-8192 for high reasoning
        $this->model = config('services.groq.model', 'llama3-8b-8192');
    }

    public function generate(string $prompt, array $history = [], ?string $systemInstruction = null, array $options = []): string
    {
        if (!$this->apiKey) {
            throw new Exception("Groq API key is not configured.");
        }

        $messages = $this->mapMessages($prompt, $history, $systemInstruction);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout($options['timeout'] ?? 15)->post('https://api.groq.com/openai/v1/chat/completions', [
            'model' => $this->model,
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? 0.7,
            'max_tokens' => $options['maxOutputTokens'] ?? 1000,
        ]);

        if (!$response->successful()) {
            Log::error('Groq API Error: ' . $response->body());
            throw new Exception("Groq API returned error: " . $response->status());
        }

        return $response->json('choices.0.message.content') ?? '';
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
            throw new Exception("Groq API key is not configured.");
        }

        $messages = $this->mapMessages($prompt, $history, $systemInstruction);

        // Note: For now, we fall back or skip function calling for Groq if not implemented,
        // but to prevent errors we will log if tools are requested.
        if (!empty($tools)) {
            Log::warning("Tools were requested for GroqProvider stream but are not currently supported in this driver. Proceeding without tools.");
        }

        $postData = [
            'model' => $this->model,
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? 0.5,
            'max_tokens' => $options['maxOutputTokens'] ?? 1000,
            'stream' => true,
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.groq.com/openai/v1/chat/completions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->apiKey,
        ]);

        // We process OpenAI's chunk stream and map it to Gemini format
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $data) use ($onChunk) {
            $lines = explode("\n", $data);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line)) {
                    continue;
                }

                if ($line === 'data: [DONE]') {
                    $onChunk("data: [DONE]\n\n");
                    continue;
                }

                if (strpos($line, 'data: ') === 0) {
                    $jsonStr = substr($line, 6);
                    $decoded = json_decode($jsonStr, true);
                    
                    $content = $decoded['choices'][0]['delta']['content'] ?? '';
                    if ($content !== '') {
                        // Map OpenAI SSE chunk to Gemini SSE chunk format
                        $geminiPayload = [
                            'candidates' => [
                                [
                                    'content' => [
                                        'parts' => [
                                            ['text' => $content]
                                        ]
                                    ]
                                ]
                            ]
                        ];
                        $onChunk("data: " . json_encode($geminiPayload) . "\n\n");
                    }
                }
            }
            return strlen($data);
        });

        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || $res === false) {
            Log::error("Groq SSE API stream failed. HTTP Code: {$httpCode}");
            throw new Exception("Groq Stream failed.");
        }
    }

    protected function mapMessages(string $prompt, array $history, ?string $systemInstruction): array
    {
        $messages = [];

        if ($systemInstruction) {
            $messages[] = [
                'role' => 'system',
                'content' => $systemInstruction
            ];
        }

        foreach ($history as $chatItem) {
            if (empty($chatItem['text']) || trim($chatItem['text']) === '') {
                continue;
            }
            $role = ($chatItem['sender'] === 'user') ? 'user' : 'assistant';
            $messages[] = [
                'role' => $role,
                'content' => $chatItem['text']
            ];
        }

        $messages[] = [
            'role' => 'user',
            'content' => $prompt
        ];

        return $messages;
    }
}
