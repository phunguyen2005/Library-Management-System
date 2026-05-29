<?php

namespace App\Services\Ai;

use App\Models\Book;
use Illuminate\Support\Str;

class OfflineProvider implements AiProviderInterface
{
    public function generate(string $prompt, array $history = [], ?string $systemInstruction = null, array $options = []): string
    {
        return $this->getOfflineResponse($prompt);
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
        $responseText = $this->getOfflineResponse($prompt);

        // Stream the offline response chunk by chunk to simulate real-time generation
        $chunks = mb_str_split($responseText, 12, 'UTF-8');
        foreach ($chunks as $chunk) {
            $payload = [
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                ['text' => $chunk]
                            ]
                        ]
                    ]
                ]
            ];
            $onChunk("data: " . json_encode($geminiPayload ?? $payload) . "\n\n");
            usleep(25000); // 25ms pause for smooth streaming experience
        }
        $onChunk("data: [DONE]\n\n");
    }

    protected function getOfflineResponse(string $message): string
    {
        $normalizedMsg = mb_strtolower($message, 'UTF-8');

        // Greeting flow
        if ($this->isGreetingMessage($normalizedMsg)) {
            return "Xin chào bạn! Tôi là **Thủ thư AI** của Thư viện HCMUE. 📚\n\nTôi có thể giúp bạn:\n"
                . "* 🔍 Tìm kiếm sách theo từ khóa hoặc thể loại.\n"
                . "* 💡 Gợi ý sách hay phù hợp với ngành học.\n"
                . "* 📋 Giải đáp thắc mắc về quy trình mượn trả và đặt chỗ sách vật lý.\n\nBạn muốn tìm tài liệu về chủ đề gì hôm nay?";
        }

        // Process flow
        if (Str::contains($normalizedMsg, ['quy trình', 'mượn sách', 'nhận sách', 'quét', 'qr', 'hướng dẫn mượn'])) {
            return "### Quy trình mượn sách tại thư viện:\n\n"
                . "1. **Yêu cầu trực tuyến**: Bạn truy cập trang **Danh mục**, chọn cuốn sách muốn mượn và click **Mượn ngay**.\n"
                . "2. **Thủ thư phê duyệt**: Yêu cầu sẽ gửi đến hệ thống quản lý. Khi được duyệt, bạn sẽ nhận được thông báo in-app và email kèm mã QR.\n"
                . "3. **Nhận sách**: Bạn đến thư viện, trình mã QR của phiếu mượn (trong mục *Yêu cầu của tôi* hoặc email) cho thủ thư quét để nhận sách trực tiếp. Bạn có **24 giờ** để đến nhận sách kể từ khi được duyệt.";
        }

        // Reservation flow
        if (Str::contains($normalizedMsg, ['đặt chỗ', 'hết sách', 'chờ', 'hàng đợi', 'reservation'])) {
            return "### Tính năng Đặt chỗ trước (Reservation Queue):\n\n"
                . "Khi một cuốn sách bạn thích đã **hết bản sẵn có** (số lượng khả dụng bằng 0):\n"
                . "1. Hãy click vào chi tiết cuốn sách đó trên trang **Danh mục**.\n"
                . "2. Bạn sẽ thấy nút **\"Đặt chỗ trước\"** kèm theo vị trí của bạn trong hàng đợi hiện tại.\n"
                . "3. Click đặt chỗ, bạn sẽ được xếp vào hàng đợi chờ tự động.\n"
                . "4. Khi người mượn trước trả sách, hệ thống sẽ tự động duyệt phiếu mượn cho bạn (người xếp thứ nhất) và gửi thông báo. Bạn có 24h để qua nhận sách!";
        }

        // Database search based on keywords
        $genres = Book::query()->where('is_digital', false)->distinct()->pluck('genre')->toArray();
        $matchedGenre = null;
        foreach ($genres as $g) {
            if ($g && Str::contains($normalizedMsg, mb_strtolower($g, 'UTF-8'))) {
                $matchedGenre = $g;
                break;
            }
        }

        $query = Book::query()->where('is_digital', false);
        if ($matchedGenre) {
            $query->where('genre', $matchedGenre);
        } else {
            $keywords = ['lập trình', 'web', 'cơ sở dữ liệu', 'thiết kế', 'software', 'phần mềm', 'giáo dục', 'sư phạm', 'toán', 'văn', 'anh'];
            $matchedKeyword = null;
            foreach ($keywords as $kw) {
                if (Str::contains($normalizedMsg, $kw)) {
                    $matchedKeyword = $kw;
                    break;
                }
            }

            if ($matchedKeyword) {
                $query->where('title', 'like', "%{$matchedKeyword}%")
                      ->orWhere('genre', 'like', "%{$matchedKeyword}%")
                      ->orWhere('author', 'like', "%{$matchedKeyword}%");
            } else {
                $query->inRandomOrder();
            }
        }

        $matchedBooks = $query->limit(3)->get();

        if ($matchedBooks->isNotEmpty()) {
            $bookLines = $matchedBooks->map(function ($b) {
                $statusStr = $b->available_quantity > 0 ? "Còn sách (Kệ: {$b->location})" : "Đã hết (có thể Đặt chỗ)";
                return "* **{$b->title}** - Tác giả: *{$b->author}* [ID: {$b->book_id}] ({$statusStr})";
            })->join("\n");

            $genreIntro = $matchedGenre ? "thể loại **{$matchedGenre}**" : "từ khóa bạn vừa tìm kiếm";

            return "[Trợ lý ngoại tuyến] Tôi đã tìm thấy một số cuốn sách phù hợp liên quan đến {$genreIntro} trong thư viện của chúng ta:\n\n"
                . $bookLines . "\n\n"
                . "Bạn có thể gõ mã sách hoặc click vào cuốn sách trên màn hình Danh mục để xem chi tiết và đăng ký mượn ngay nhé! Nếu bạn cần hướng dẫn gì thêm, hãy cứ tự nhiên hỏi tôi.";
        }

        return "[Trợ lý ngoại tuyến] Cảm ơn bạn đã trò chuyện! Thư viện HCMUE có rất nhiều tài liệu phong phú thuộc nhiều ngành học.\n\n"
            . "Bạn có thể thử tìm kiếm với các từ khóa cụ thể như: *\"Lập trình\"*, *\"Cơ sở dữ liệu\"*, *\"Giáo trình\"*... hoặc hỏi tôi về *\"Quy trình mượn sách\"* và *\"Cách đặt chỗ\"*.\n\nTôi luôn sẵn sàng hỗ trợ!";
    }

    protected function isGreetingMessage(string $normalizedMsg): bool
    {
        return preg_match('/(?:^|[^\p{L}])(?:chào|hello|hi|bắt đầu)(?:$|[^\p{L}])/u', $normalizedMsg) === 1;
    }
}
