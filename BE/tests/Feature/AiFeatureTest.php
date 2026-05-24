<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_chat_returns_fallback_greeting(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-token', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/ai/chat', [
                'message' => 'chào trợ lý AI',
            ])
            ->assertOk()
            ->assertJsonStructure(['response'])
            ->assertJsonFragment([
                'response' => "Xin chào bạn! Tôi là **Thủ thư AI** của Thư viện HCMUE. 📚\n\nTôi có thể giúp bạn:\n"
                    . "* 🔍 Tìm kiếm sách theo từ khóa hoặc thể loại.\n"
                    . "* 💡 Gợi ý sách hay phù hợp với ngành học.\n"
                    . "* 📋 Giải đáp thắc mắc về quy trình mượn trả và đặt chỗ sách vật lý.\n\nBạn muốn tìm tài liệu về chủ đề gì hôm nay?"
            ]);
    }

    public function test_chat_returns_fallback_process(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-token', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/ai/chat', [
                'message' => 'Quy trình mượn trả sách như thế nào?',
            ])
            ->assertOk()
            ->assertJsonStructure(['response'])
            ->assertJsonFragment([
                'response' => "### Quy trình mượn sách tại thư viện:\n\n"
                    . "1. **Yêu cầu trực tuyến**: Bạn truy cập trang **Danh mục**, chọn cuốn sách muốn mượn và click **Mượn ngay**.\n"
                    . "2. **Thủ thư phê duyệt**: Yêu cầu sẽ gửi đến hệ thống quản lý. Khi được duyệt, bạn sẽ nhận được thông báo in-app và email kèm mã QR.\n"
                    . "3. **Nhận sách**: Bạn đến thư viện, trình mã QR của phiếu mượn (trong mục *Yêu cầu của tôi* hoặc email) cho thủ thư quét để nhận sách trực tiếp. Bạn có **24 giờ** để đến nhận sách kể từ khi được duyệt."
            ]);
    }

    public function test_recommendations_returns_fallback_personalization(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-token', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/ai/recommendations')
            ->assertOk()
            ->assertJsonStructure([
                '*' => [
                    'book' => [
                        'book_id',
                        'title',
                        'author',
                    ],
                    'reason',
                ]
            ]);
    }
}
