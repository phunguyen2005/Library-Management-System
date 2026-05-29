<?php

namespace App\Services\Ai;

use Exception;
use Illuminate\Support\Facades\Log;

class AiManager
{
    protected array $drivers = [];
    protected string $defaultProvider;

    public function __construct()
    {
        $this->defaultProvider = config('services.ai.preferred_provider', 'gemini');
    }

    /**
     * Lấy driver xử lý cụ thể theo tên (ví dụ: 'gemini', 'groq', 'offline')
     */
    public function driver(?string $name = null): AiProviderInterface
    {
        $name = $name ?: $this->defaultProvider;

        if (isset($this->drivers[$name])) {
            return $this->drivers[$name];
        }

        $this->drivers[$name] = $this->resolveDriver($name);
        return $this->drivers[$name];
    }

    /**
     * Khởi tạo driver tương ứng
     */
    protected function resolveDriver(string $name): AiProviderInterface
    {
        switch ($name) {
            case 'gemini':
                return app(GeminiProvider::class);
            case 'groq':
                return app(GroqProvider::class);
            case 'offline':
                return app(OfflineProvider::class);
            default:
                throw new Exception("AI Driver [{$name}] is not supported.");
        }
    }

    /**
     * Sinh phản hồi chuẩn với cơ chế tự động dự phòng (Failover)
     */
    public function generate(string $prompt, array $history = [], ?string $systemInstruction = null, array $options = []): string
    {
        $order = [$this->defaultProvider, $this->defaultProvider === 'gemini' ? 'groq' : 'gemini', 'offline'];
        $order = array_unique($order);

        foreach ($order as $providerName) {
            try {
                $driver = $this->driver($providerName);
                return $driver->generate($prompt, $history, $systemInstruction, $options);
            } catch (Exception $e) {
                Log::warning("AI Generate Provider [{$providerName}] failed, falling back: " . $e->getMessage());
            }
        }

        return "Xin lỗi, hiện tại tôi không thể xử lý yêu cầu này.";
    }

    /**
     * Stream phản hồi thời gian thực với cơ chế tự động dự phòng (Failover)
     */
    public function stream(
        string $prompt,
        array $history = [],
        ?string $systemInstruction = null,
        array $tools = [],
        ?callable $onToolCall = null,
        callable $onChunk = null,
        array $options = []
    ): void {
        $order = [$this->defaultProvider, $this->defaultProvider === 'gemini' ? 'groq' : 'gemini', 'offline'];
        $order = array_unique($order);

        foreach ($order as $providerName) {
            try {
                $driver = $this->driver($providerName);
                $driver->stream($prompt, $history, $systemInstruction, $tools, $onToolCall, $onChunk, $options);
                return;
            } catch (Exception $e) {
                Log::warning("AI Stream Provider [{$providerName}] failed, falling back: " . $e->getMessage());
            }
        }

        // Nếu tất cả đều sập, chạy thẳng luồng offline stream để chống lỗi màn hình trắng cho client
        try {
            $offline = $this->driver('offline');
            $offline->stream($prompt, $history, $systemInstruction, $tools, $onToolCall, $onChunk, $options);
        } catch (Exception $ex) {
            Log::error("Critical: All AI Streamers and Offline Driver failed: " . $ex->getMessage());
        }
    }
}
