<?php

namespace App\Services\Ai;

interface AiProviderInterface
{
    /**
     * Gửi hội thoại thường (không streaming) và nhận phản hồi toàn bộ.
     *
     * @param string $prompt
     * @param array $history
     * @param string|null $systemInstruction
     * @param array $options Cấu hình tùy chọn như temperature, maxTokens...
     * @return string
     */
    public function generate(string $prompt, array $history = [], ?string $systemInstruction = null, array $options = []): string;

    /**
     * Gửi hội thoại dạng streaming (SSE) và trả về từng phần dữ liệu qua $onChunk.
     *
     * @param string $prompt
     * @param array $history
     * @param string|null $systemInstruction
     * @param array $tools Schema công cụ cho function calling
     * @param callable|null $onToolCall Callback thực thi khi AI yêu cầu gọi tool
     * @param callable $onChunk Callback nhận từng chuỗi ký tự phản hồi
     * @param array $options
     * @return void
     */
    public function stream(
        string $prompt,
        array $history = [],
        ?string $systemInstruction = null,
        array $tools = [],
        ?callable $onToolCall = null,
        callable $onChunk = null,
        array $options = []
    ): void;
}
