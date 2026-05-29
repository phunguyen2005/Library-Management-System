<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Reservation;
use App\Models\Fine;
use App\Models\RoomBooking;
use App\Services\Ai\AiManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiChatController extends Controller
{
    protected AiManager $ai;

    public function __construct(AiManager $ai)
    {
        $this->ai = $ai;
    }

    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'history' => 'nullable|array',
        ]);

        $message = $request->input('message');
        $history = $request->input('history', []);

        // Giới hạn lịch sử gửi lên AI (chỉ giữ 8 tin nhắn gần nhất để tránh phình to payload)
        if (count($history) > 8) {
            $history = array_slice($history, -8);
        }

        // Tối ưu hóa Context bằng Simple SQL RAG (chỉ tìm 10 sách liên quan thay vì lấy toàn bộ DB)
        $catalogText = $this->getRelevantBooksContext($message);

        $systemPrompt = "Bạn là thủ thư AI thông thái và thân thiện của Thư viện trường Đại học Sư phạm TP.HCM (HCMUE).\n"
            . "Nhiệm vụ của bạn là tư vấn, tìm kiếm sách và hướng dẫn quy trình cho sinh viên một cách lịch sự, chuyên nghiệp bằng tiếng Việt.\n\n"
            . "Dưới đây là một số cuốn sách nổi bật/phù hợp với nội dung câu hỏi trong hệ thống thư viện:\n"
            . $catalogText . "\n\n"
            . "HƯỚNG DẪN TRẢ LỜI:\n"
            . "1. Trả lời câu hỏi ngắn gọn, rõ ràng, sử dụng định dạng Markdown (in đậm, danh sách gạch đầu dòng).\n"
            . "2. Hãy luôn nhiệt tình tìm kiếm và gợi ý các cuốn sách phù hợp từ danh sách ở trên khi người dùng hỏi về bất kỳ chủ đề gì liên quan.\n"
            . "3. QUAN TRỌNG: Khi gợi ý sách, bạn PHẢI viết kèm mã ID sách chính xác dưới dạng '[ID: X]' (ví dụ: 'Tôi gợi ý cuốn Clean Code [ID: 5]...'). Giao diện người dùng sẽ dùng mã này để tạo liên kết cho phép click xem trực tiếp. Đừng quên định dạng [ID: X] này!\n"
            . "4. Nếu người dùng hỏi về quy trình mượn sách, hãy giải thích: Sinh viên gửi yêu cầu trực tuyến trên web -> Thủ thư duyệt -> Sinh viên nhận mã QR trên mail/in-app -> Sinh viên đến thư viện đưa thủ thư quét QR để nhận sách. Thời hạn nhận sách là 24 giờ.\n"
            . "5. Nếu sách họ muốn mượn đã hết (available_quantity = 0), hãy nhắc họ có thể click vào chi tiết sách để sử dụng tính năng 'Đặt chỗ trước' (Reservation Queue) để xếp hàng chờ tự động.\n";

        // Generate response using our dynamic multi-provider AI Manager
        $response = $this->ai->generate($message, $history, $systemPrompt);

        return response()->json(['response' => $response]);
    }

    public function recommendations(Request $request)
    {
        $member = $request->user();

        // Get student's history
        $favorites = $member->favoriteBooks()->get(['books.book_id', 'title', 'genre']);
        $borrowedIds = Borrowing::where('member_id', $member->member_id)
            ->distinct()
            ->pluck('book_id')
            ->toArray();

        $borrowedBooks = Book::whereIn('book_id', $borrowedIds)->get(['book_id', 'title', 'genre']);

        // Load available books for recommendation pool
        $booksPool = Book::where('is_digital', false)
            ->whereNotIn('book_id', $borrowedIds) // Don't suggest books already borrowed
            ->limit(30)
            ->get(['book_id', 'title', 'author', 'genre', 'is_available', 'available_quantity']);

        if ($booksPool->isNotEmpty()) {
            try {
                $historyText = "Sách sinh viên yêu thích:\n" . $favorites->map(fn($f) => "- {$f->title} (Thể loại: {$f->genre})")->join("\n") . "\n\n"
                    . "Sách sinh viên đã từng mượn:\n" . $borrowedBooks->map(fn($b) => "- {$b->title} (Thể loại: {$b->genre})")->join("\n");

                $poolText = "Danh mục sách có thể giới thiệu:\n" . $booksPool->map(fn($p) => "- [ID: {$p->book_id}] \"{$p->title}\" của tác giả {$p->author} (Thể loại: {$p->genre}, " . ($p->available_quantity > 0 ? "Còn sách" : "Hết sách") . ")")->join("\n");

                $prompt = "Dựa trên lịch sử đọc sách và sách yêu thích của sinh viên dưới đây:\n\n"
                    . $historyText . "\n\n"
                    . "Hãy chọn ra tối đa 4 cuốn sách phù hợp nhất từ danh mục sách có thể giới thiệu sau:\n\n"
                    . $poolText . "\n\n"
                    . "Yêu cầu trả về kết quả dưới định dạng JSON thuần túy (Mảng các object, không đặt trong thẻ ```json), cấu trúc như sau:\n"
                    . "[\n"
                    . "  {\n"
                    . "    \"book_id\": 5,\n"
                    . "    \"reason\": \"Lý do gợi ý cá nhân hóa ngắn gọn, thuyết phục bằng tiếng Việt (tối đa 2 câu). Ví dụ: Vì bạn đã yêu thích cuốn Clean Code, tác phẩm này sẽ giúp bạn nâng tầm tư duy thiết kế hệ thống...\"\n"
                    . "  }\n"
                    . "]";

                $jsonText = $this->ai->generate($prompt, [], null, [
                    'temperature' => 0.5,
                    'maxOutputTokens' => 600,
                ]);

                // Clean markdown block wrappers if returned by AI
                $jsonText = trim($jsonText);
                $jsonText = preg_replace('/^```(?:json)?\s+|\s+```$/', '', $jsonText);
                $recommendationList = json_decode($jsonText, true);

                if (is_array($recommendationList)) {
                    $results = [];
                    foreach ($recommendationList as $item) {
                        $book = Book::find($item['book_id']);
                        if ($book) {
                            $bookResource = new \App\Http\Resources\BookResource($book);
                            $results[] = [
                                'book' => $bookResource,
                                'reason' => $item['reason']
                            ];
                        }
                    }

                    if (!empty($results)) {
                        return response()->json($results);
                    }
                }
            } catch (\Exception $e) {
                Log::error('AI Recommendations Manager Error: ' . $e->getMessage());
            }
        }

        // --- FALLBACK MOCK RECOMMENDATION ENGINE ---
        $preferredGenres = $favorites->pluck('genre')
            ->concat($borrowedBooks->pluck('genre'))
            ->filter()
            ->unique()
            ->toArray();

        $query = Book::where('is_digital', false)
            ->whereNotIn('book_id', $borrowedIds);

        if (!empty($preferredGenres)) {
            $query->whereIn('genre', $preferredGenres);
        }

        $suggested = $query->inRandomOrder()->limit(4)->get();

        if ($suggested->count() < 4) {
            $additionalIds = $suggested->pluck('book_id')->toArray();
            $moreBooks = Book::where('is_digital', false)
                ->whereNotIn('book_id', array_merge($borrowedIds, $additionalIds))
                ->inRandomOrder()
                ->limit(4 - $suggested->count())
                ->get();
            $suggested = $suggested->concat($moreBooks);
        }

        $results = [];
        foreach ($suggested as $b) {
            $genreName = $b->genre ?: 'học thuật';
            $reason = "Dựa trên sở thích của bạn với thể loại **{$genreName}**, tác phẩm này sẽ cung cấp cho bạn những góc nhìn học thuật và thực tiễn vô cùng hữu ích.";
            
            if ($favorites->isNotEmpty()) {
                $firstFav = $favorites->first();
                if ($firstFav->genre === $b->genre) {
                    $reason = "Vì bạn đã yêu thích cuốn \"{$firstFav->title}\", Thủ thư gợi ý tác phẩm này để giúp bạn mở rộng chiều sâu kiến thức cùng thể loại **{$genreName}**.";
                }
            }

            $results[] = [
                'book' => new \App\Http\Resources\BookResource($b),
                'reason' => $reason
            ];
        }

        return response()->json($results);
    }

    public function chatStream(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'history' => 'nullable|array',
        ]);

        $message = $request->input('message');
        $history = $request->input('history', []);
        $member = auth('sanctum')->user();

        // Giới hạn lịch sử gửi lên AI (chỉ giữ 8 tin nhắn gần nhất để tránh phình to payload)
        if (count($history) > 8) {
            $history = array_slice($history, -8);
        }

        // Tối ưu hóa Context bằng Simple SQL RAG (chỉ tìm 10 sách liên quan thay vì lấy toàn bộ DB)
        $catalogText = $this->getRelevantBooksContext($message);

        $systemPrompt = "Bạn là thủ thư AI thông thái và thân thiện của Thư viện trường Đại học Sư phạm TP.HCM (HCMUE).\n"
            . "Nhiệm vụ của bạn là tư vấn, tìm kiếm sách, giải đáp các thắc mắc của sinh viên và hướng dẫn quy trình một cách lịch sự, chuyên nghiệp bằng tiếng Việt.\n\n"
            . "Dưới đây là một số cuốn sách nổi bật/phù hợp với nội dung câu hỏi trong hệ thống thư viện:\n"
            . $catalogText . "\n\n"
            . "HƯỚNG DẪN TRẢ LỜI:\n"
            . "1. Trả lời câu hỏi ngắn gọn, rõ ràng, sử dụng định dạng Markdown (in đậm, danh sách gạch đầu dòng).\n"
            . "2. Hãy luôn nhiệt tình tìm kiếm và gợi ý các cuốn sách phù hợp từ danh sách ở trên khi người dùng hỏi về bất kỳ chủ đề gì liên quan.\n"
            . "3. QUAN TRỌNG: Khi gợi ý sách, bạn PHẢI viết kèm mã ID sách chính xác dưới dạng '[ID: X]' (ví dụ: 'Tôi gợi ý cuốn Clean Code [ID: 5]...'). Giao diện người dùng sẽ dùng mã này để tạo liên kết cho phép click xem trực tiếp. Đừng quên định dạng [ID: X] này!\n"
            . "4. Nếu người dùng hỏi về quy trình mượn sách, hãy giải thích: Sinh viên gửi yêu cầu trực tuyến trên web -> Thủ thư duyệt -> Sinh viên nhận mã QR trên mail/in-app -> Sinh viên đến thư viện đưa thủ thư quét QR để nhận sách. Thời hạn nhận sách là 24 giờ.\n"
            . "5. Nếu sách họ muốn mượn đã hết (available_quantity = 0), hãy nhắc họ có thể click vào chi tiết sách để sử dụng tính năng 'Đặt chỗ trước' (Reservation Queue) để xếp hàng chờ tự động.\n"
            . ($member
                ? "6. Bạn được cung cấp các công cụ (Tools) để xem sách đang mượn (getMyBorrowings), xem tiền phạt (getMyFines), và xem lịch đặt phòng tự học (getMyRoomBookings) của sinh viên này. Hãy gọi công cụ khi họ hỏi về thông tin cá nhân của họ."
                : "6. Người dùng hiện chưa đăng nhập. Nếu họ hỏi về thông tin cá nhân (lịch sử mượn, tiền phạt, phòng tự học), hãy nhắc họ đăng nhập để xem thông tin đó."
            );

        // Declare tools schema for Gemini native function calling
        $tools = [
            [
                'functionDeclarations' => [
                    [
                        'name' => 'getMyBorrowings',
                        'description' => 'Lấy danh sách các cuốn sách đang mượn hoặc lịch sử mượn sách của sinh viên hiện tại.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => (object)[]
                        ]
                    ],
                    [
                        'name' => 'getMyFines',
                        'description' => 'Lấy danh sách tất cả các khoản tiền phạt (chưa thanh toán hoặc đã thanh toán) của sinh viên hiện tại.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => (object)[]
                        ]
                    ],
                    [
                        'name' => 'getMyRoomBookings',
                        'description' => 'Lấy danh sách các phòng tự học được đặt (room bookings) của sinh viên hiện tại.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => (object)[]
                        ]
                    ]
                ]
            ]
        ];

        // Check if user is asking about personal details that require tools
        $normalizedMsg = mb_strtolower($message, 'UTF-8');
        $needsTools = $member && Str::contains($normalizedMsg, [
            'của tôi', 'cá nhân', 'tôi mượn', 'đang mượn', 'lịch sử mượn',
            'tiền phạt', 'phạt', 'đóng phạt', 'nợ phạt',
            'đặt phòng', 'phòng tự học', 'phòng nhóm', 'lịch đặt phòng', 'phòng của tôi'
        ]);

        return response()->stream(function () use ($message, $history, $systemPrompt, $tools, $member, $needsTools) {
            $activeTools = $needsTools ? $tools : [];

            $onToolCall = function ($name, $args) use ($member) {
                return $this->executeFunction($name, $args, $member);
            };

            $onChunk = function ($chunk) {
                echo $chunk;
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            };

            $this->ai->stream($message, $history, $systemPrompt, $activeTools, $onToolCall, $onChunk);
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Thu thập danh mục sách liên quan nhất dựa trên SQL RAG để tối ưu token payload.
     */
    private function getRelevantBooksContext(string $message): string
    {
        $normalizedMsg = mb_strtolower($message, 'UTF-8');

        // Bỏ bớt các từ nối tiếng Việt siêu phổ biến để thu được từ khóa chất lượng
        $stopWords = [
            'và', 'của', 'tôi', 'em', 'bạn', 'có', 'không', 'tìm', 'cuốn', 'sách', 
            'cho', 'mượn', 'nào', 'gì', 'ở', 'đâu', 'được', 'lấy', 'muốn', 'hướng', 
            'dẫn', 'quy', 'trình', 'đặt', 'chỗ', 'hết', 'còn', 'trên', 'dưới', 
            'trong', 'ngoài', 'thư', 'viện', 'hệ', 'thống', 'xin', 'chào', 'bot', 
            'thủ', 'thư', 'nhờ', 'giúp', 'một', 'những', 'cách', 'làm', 'sao'
        ];

        // Tách các từ đơn
        $words = preg_split('/[\s,;.?!]+/', $normalizedMsg, -1, PREG_SPLIT_NO_EMPTY);
        $keywords = [];

        foreach ($words as $word) {
            if (!in_array($word, $stopWords) && mb_strlen($word, 'UTF-8') > 1) {
                $keywords[] = $word;
            }
        }

        $query = Book::query();

        // Tìm kiếm các sách khớp với một trong các từ khóa thu được
        if (!empty($keywords)) {
            $query->where(function ($q) use ($keywords) {
                foreach ($keywords as $kw) {
                    $q->orWhere('title', 'like', "%{$kw}%")
                      ->orWhere('author', 'like', "%{$kw}%")
                      ->orWhere('genre', 'like', "%{$kw}%");
                }
            });
        }

        $books = $query->limit(10)->get(['book_id', 'title', 'author', 'genre', 'is_available', 'available_quantity', 'location']);

        // Nếu số lượng sách khớp quá ít (dưới 6), bổ sung thêm một số sách ngẫu nhiên có sẵn để bot luôn có mẫu sách tư vấn phong phú
        if ($books->count() < 6) {
            $excludeIds = $books->pluck('book_id')->toArray();
            $extraBooks = Book::whereNotIn('book_id', $excludeIds)
                ->inRandomOrder()
                ->limit(10 - $books->count())
                ->get(['book_id', 'title', 'author', 'genre', 'is_available', 'available_quantity', 'location']);
            $books = $books->concat($extraBooks);
        }

        // Định dạng danh sách sách thành dạng Markdown context gọn gàng
        return $books->map(fn($b) => "- [ID: {$b->book_id}] \"{$b->title}\" của tác giả {$b->author} (Thể loại: {$b->genre}, Kệ: {$b->location}, " . ($b->is_available ? "Còn sách" : "Hết sách") . ")")->join("\n");
    }

    private function executeFunction($name, $args, $member)
    {
        try {
            if ($name === 'getMyBorrowings') {
                $borrowings = Borrowing::where('member_id', $member->member_id)
                    ->with('book')
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get();

                return $borrowings->map(fn($b) => [
                    'book_title' => $b->book?->title ?? 'Sách đã xóa',
                    'book_id' => $b->book_id,
                    'status' => $b->status,
                    'due_date' => $b->due_date ? $b->due_date->toDateString() : null,
                    'fine_amount' => $b->fine?->amount ?? 0
                ])->toArray();
            }

            if ($name === 'getMyFines') {
                $fines = Fine::where('member_id', $member->member_id)
                    ->orderBy('created_at', 'desc')
                    ->get();

                return $fines->map(fn($f) => [
                    'fine_id' => $f->fine_id,
                    'amount' => $f->amount,
                    'reason' => $f->reason,
                    'status' => $f->status, // paid, unpaid
                    'created_at' => $f->created_at ? $f->created_at->toDateString() : null
                ])->toArray();
            }

            if ($name === 'getMyRoomBookings') {
                $bookings = RoomBooking::where('member_id', $member->member_id)
                    ->with('room')
                    ->orderBy('booking_date', 'desc')
                    ->limit(5)
                    ->get();

                return $bookings->map(fn($b) => [
                    'room_name' => $b->room?->name ?? 'Phòng đã xóa',
                    'booking_date' => $b->booking_date ? $b->booking_date->toDateString() : null,
                    'start_time' => $b->start_time,
                    'end_time' => $b->end_time,
                    'status' => $b->status
                ])->toArray();
            }
        } catch (\Exception $e) {
            Log::error("Error executing function $name in Controller: " . $e->getMessage());
            return ['error' => 'Không thể thực thi hàm: ' . $e->getMessage()];
        }

        return ['error' => 'Hàm không hợp lệ hoặc chưa định nghĩa'];
    }
}
