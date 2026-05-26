<?php

namespace Tests\Feature;

use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AiChatControllerTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_offline_chat_responses_use_valid_vietnamese_copy(): void
    {
        $token = $this->memberToken();

        foreach ([
            'xin chào' => 'Xin chào bạn! Tôi là **Thủ thư AI**',
            'quy trình mượn sách' => 'Quy trình mượn sách tại thư viện',
            'đặt chỗ khi hết sách' => 'Tính năng Đặt chỗ trước',
        ] as $message => $expectedCopy) {
            $response = $this->withToken($token)
                ->postJson('/api/ai/chat', [
                    'message' => $message,
                    'history' => [],
                ]);

            $response->assertOk();

            $text = (string) $response->json('response');

            $this->assertStringContainsString($expectedCopy, $text);
            $this->assertDoesNotMatchRegularExpression('/(?:Ã|Ä|Æ|ðŸ|áº|á»|â€|â„|âœ|â|âš|â|â”|â–|â—|â†)/u', $text);
        }
    }

    public function test_offline_chat_stream_uses_valid_vietnamese_copy(): void
    {
        $response = $this->withToken($this->memberToken())
            ->postJson('/api/ai/chat-stream', [
                'message' => 'xin chào',
                'history' => [],
            ]);

        $response->assertOk();

        $text = $this->extractStreamText($response->streamedContent());

        $this->assertStringContainsString('Xin chào bạn! Tôi là **Thủ thư AI**', $text);
        $this->assertStringContainsString('Tìm kiếm sách theo từ khóa', $text);
        $this->assertDoesNotMatchRegularExpression('/(?:Ã|Ä|Æ|ðŸ|áº|á»|â€|â„|âœ|â|âš|â|â”|â–|â—|â†)/u', $text);
    }

    private function memberToken(): string
    {
        $member = Member::query()->findOrFail(1);
        $member->forceFill([
            'email_verified_at' => now(),
            'password' => Hash::make('Library@2026'),
        ])->save();

        return $member->createToken('ai-chat-access', ['role:student'])->plainTextToken;
    }

    private function extractStreamText(string $streamedContent): string
    {
        $text = '';

        foreach (preg_split('/\r?\n/', $streamedContent) ?: [] as $line) {
            if (! str_starts_with($line, 'data: ')) {
                continue;
            }

            $payload = trim(substr($line, 6));
            if ($payload === '[DONE]') {
                continue;
            }

            $decoded = json_decode($payload, true);
            $text .= $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '';
        }

        return $text;
    }
}
