<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Reservation;
use App\Models\Fine;
use App\Models\RoomBooking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiChatController extends Controller
{
    private function getApiKey(): ?string
    {
        $key = env('GEMINI_API_KEY');
        if (empty($key) || $key === 'MY_GEMINI_API_KEY') {
            return null;
        }
        return $key;
    }

    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'history' => 'nullable|array',
        ]);

        $message = $request->input('message');
        $history = $request->input('history', []);
        $apiKey = $this->getApiKey();

        // Load entire book catalog as context
        $books = Book::all(['book_id', 'title', 'author', 'genre', 'is_available', 'available_quantity', 'location']);
        $catalogText = $books->map(fn($b) => "- [ID: {$b->book_id}] \"{$b->title}\" của tác giả {$b->author} (Thể loại: {$b->genre}, Kệ: {$b->location}, " . ($b->is_available ? "Còn sách" : "Hết sách") . ")")->join("\n");

        $systemPrompt = "Bạn là thủ thư AI thông thái và thân thiện của Thư viện trường Đại học Sư phạm TP.HCM (HCMUE).\n"
            . "Nhiệm vụ của bạn là tư vấn, tìm kiếm sách và hướng dẫn quy trình cho sinh viên một cách lịch sự, chuyên nghiệp bằng tiếng Việt.\n\n"
            . "Đây là danh mục sách hiện có trong hệ thống thư viện:\n"
            . $catalogText . "\n\n"
            . "HƯỚNG DẪN TRẢ LỜI:\n"
            . "1. Trả lời câu hỏi ngắn gọn, rõ ràng, sử dụng định dạng Markdown (in đậm, danh sách gạch đầu dòng).\n"
            . "2. Hãy luôn nhiệt tình tìm kiếm và gợi ý các cuốn sách phù hợp từ danh mục trên khi người dùng hỏi về bất kỳ chủ đề gì liên quan.\n"
            . "3. QUAN TRỌNG: Khi gợi ý sách, bạn PHẢI viết kèm mã ID sách chính xác dưới dạng '[ID: X]' (ví dụ: 'Tôi gợi ý cuốn Clean Code [ID: 5]...'). Giao diện người dùng sẽ dùng mã này để tạo liên kết cho phép click xem trực tiếp. Đừng quên định dạng [ID: X] này!\n"
            . "4. Nếu người dùng hỏi về quy trình mượn sách, hãy giải thích: Sinh viên gửi yêu cầu trực tuyến trên web -> Thủ thư duyệt -> Sinh viên nhận mã QR trên mail/in-app -> Sinh viên đến thư viện đưa thủ thư quét QR để nhận sách. Thời hạn nhận sách là 24 giờ.\n"
            . "5. Nếu sách họ muốn mượn đã hết (available_quantity = 0), hãy nhắc họ có thể click vào chi tiết sách để sử dụng tính năng 'Đặt chỗ trước' (Reservation Queue) để xếp hàng chờ tự động.\n";

        if ($apiKey) {
            try {
                // Map history items into Gemini API roles
                $contents = [];
                foreach ($history as $chatItem) {
                    if (empty($chatItem['text']) || trim($chatItem['text']) === '') {
                        continue;
                    }
                    $role = ($chatItem['sender'] === 'user') ? 'user' : 'model';
                    $contents[] = [
                        'role' => $role,
                        'parts' => [['text' => $chatItem['text']]]
                    ];
                }

                // Add current message
                $contents[] = [
                    'role' => 'user',
                    'parts' => [['text' => $message]]
                ];

                $model = env('GEMINI_MODEL', 'gemini-1.5-flash');
                $response = Http::post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
                    'systemInstruction' => [
                        'parts' => [['text' => $systemPrompt]]
                    ],
                    'contents' => $contents,
                    'generationConfig' => [
                        'temperature' => 0.7,
                        'maxOutputTokens' => 1000,
                    ]
                ]);

                if ($response->successful()) {
                    $text = $response->json('candidates.0.content.parts.0.text');
                    if (!empty($text)) {
                        return response()->json(['response' => $text]);
                    }
                }

                Log::error('Gemini API Error: ' . $response->body());
            } catch (\Exception $e) {
                Log::error('Gemini Connection Exception: ' . $e->getMessage());
            }
        }

        // --- FALLBACK OFFLINE SEARCH ENGINE ---
        // Let's analyze keywords in the user's message
        $normalizedMsg = mb_strtolower($message, 'UTF-8');
        
        // Welcome flow
        if ($this->isGreetingMessage($normalizedMsg)) {
            return response()->json([
                'response' => "Xin chào bạn! Tôi là **Thủ thư AI** của Thư viện HCMUE. 📚\n\nTôi có thể giúp bạn:\n"
                    . "* 🔍 Tìm kiếm sách theo từ khóa hoặc thể loại.\n"
                    . "* 💡 Gợi ý sách hay phù hợp với ngành học.\n"
                    . "* 📋 Giải đáp thắc mắc về quy trình mượn trả và đặt chỗ sách vật lý.\n\nBạn muốn tìm tài liệu về chủ đề gì hôm nay?"
            ]);
        }

        // Process flow
        if (Str::contains($normalizedMsg, ['quy trình', 'mượn sách', 'nhận sách', 'quét', 'qr', 'hướng dẫn mượn'])) {
            return response()->json([
                'response' => "### Quy trình mượn sách tại thư viện:\n\n"
                    . "1. **Yêu cầu trực tuyến**: Bạn truy cập trang **Danh mục**, chọn cuốn sách muốn mượn và click **Mượn ngay**.\n"
                    . "2. **Thủ thư phê duyệt**: Yêu cầu sẽ gửi đến hệ thống quản lý. Khi được duyệt, bạn sẽ nhận được thông báo in-app và email kèm mã QR.\n"
                    . "3. **Nhận sách**: Bạn đến thư viện, trình mã QR của phiếu mượn (trong mục *Yêu cầu của tôi* hoặc email) cho thủ thư quét để nhận sách trực tiếp. Bạn có **24 giờ** để đến nhận sách kể từ khi được duyệt."
            ]);
        }

        if (Str::contains($normalizedMsg, ['đặt chỗ', 'hết sách', 'chờ', 'hàng đợi', 'reservation'])) {
            return response()->json([
                'response' => "### Tính năng Đặt chỗ trước (Reservation Queue):\n\n"
                    . "Khi một cuốn sách bạn thích đã **hết bản sẵn có** (số lượng khả dụng bằng 0):\n"
                    . "1. Hãy click vào chi tiết cuốn sách đó trên trang **Danh mục**.\n"
                    . "2. Bạn sẽ thấy nút **\"Đặt chỗ trước\"** kèm theo vị trí của bạn trong hàng đợi hiện tại.\n"
                    . "3. Click đặt chỗ, bạn sẽ được xếp vào hàng đợi chờ tự động.\n"
                    . "4. Khi người mượn trước trả sách, hệ thống sẽ tự động duyệt phiếu mượn cho bạn (người xếp thứ nhất) và gửi thông báo. Bạn có 24h để qua nhận sách!"
            ]);
        }

        // Database search fallback based on keywords
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
            // Check for general keywords in title/author
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
                // Return random 3 books if no match
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

            return response()->json([
                'response' => "[Trợ lý ngoại tuyến] Tôi đã tìm thấy một số cuốn sách phù hợp liên quan đến {$genreIntro} trong thư viện của chúng ta:\n\n"
                    . $bookLines . "\n\n"
                    . "Bạn có thể gõ mã sách hoặc click vào cuốn sách trên màn hình Danh mục để xem chi tiết và đăng ký mượn ngay nhé! Nếu bạn cần hướng dẫn gì thêm, hãy cứ tự nhiên hỏi tôi."
            ]);
        }

        return response()->json([
            'response' => "[Trợ lý ngoại tuyến] Cảm ơn bạn đã trò chuyện! Thư viện HCMUE có rất nhiều tài liệu phong phú thuộc nhiều ngành học.\n\n"
                . "Bạn có thể thử tìm kiếm với các từ khóa cụ thể như: *\"Lập trình\"*, *\"Cơ sở dữ liệu\"*, *\"Giáo trình\"*... hoặc hỏi tôi về *\"Quy trình mượn sách\"* và *\"Cách đặt chỗ\"*.\n\nTôi luôn sẵn sàng hỗ trợ!"
        ]);
    }

    public function recommendations(Request $request)
    {
        $member = $request->user();
        $apiKey = $this->getApiKey();

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

        if ($apiKey && $booksPool->isNotEmpty()) {
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

                $model = env('GEMINI_MODEL', 'gemini-1.5-flash');
                $response = Http::post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
                    'contents' => [
                        ['role' => 'user', 'parts' => [['text' => $prompt]]]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.5,
                        'maxOutputTokens' => 600,
                    ]
                ]);

                if ($response->successful()) {
                    $jsonText = trim($response->json('candidates.0.content.parts.0.text'));
                    // Clean codeblock signs if Gemini returned markdown
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
                }
            } catch (\Exception $e) {
                Log::error('Gemini Recommendations Error: ' . $e->getMessage());
            }
        }

        // --- FALLBACK MOCK RECOMMENDATION ENGINE ---
        // Pick user's favorite genres
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

        // If not enough books matching preferred genres, fill with any random books
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
        $apiKey = $this->getApiKey();
        // Optional auth: works for both guests and logged-in users
        $member = auth('sanctum')->user();

        // Load entire book catalog as context
        $books = Book::all(['book_id', 'title', 'author', 'genre', 'is_available', 'available_quantity', 'location']);
        $catalogText = $books->map(fn($b) => "- [ID: {$b->book_id}] \"{$b->title}\" của tác giả {$b->author} (Thể loại: {$b->genre}, Kệ: {$b->location}, " . ($b->is_available ? "Còn sách" : "Hết sách") . ")")->join("\n");

        $systemPrompt = "Bạn là thủ thư AI thông thái và thân thiện của Thư viện trường Đại học Sư phạm TP.HCM (HCMUE).\n"
            . "Nhiệm vụ của bạn là tư vấn, tìm kiếm sách, giải đáp các thắc mắc của sinh viên và hướng dẫn quy trình một cách lịch sự, chuyên nghiệp bằng tiếng Việt.\n\n"
            . "Đây là danh mục sách hiện có trong hệ thống thư viện:\n"
            . $catalogText . "\n\n"
            . "HƯỚNG DẪN TRẢ LỜI:\n"
            . "1. Trả lời câu hỏi ngắn gọn, rõ ràng, sử dụng định dạng Markdown (in đậm, danh sách gạch đầu dòng).\n"
            . "2. Hãy luôn nhiệt tình tìm kiếm và gợi ý các cuốn sách phù hợp từ danh mục trên khi người dùng hỏi về bất kỳ chủ đề gì liên quan.\n"
            . "3. QUAN TRỌNG: Khi gợi ý sách, bạn PHẢI viết kèm mã ID sách chính xác dưới dạng '[ID: X]' (ví dụ: 'Tôi gợi ý cuốn Clean Code [ID: 5]...'). Giao diện người dùng sẽ dùng mã này để tạo liên kết cho phép click xem trực tiếp. Đừng quên định dạng [ID: X] này!\n"
            . "4. Nếu người dùng hỏi về quy trình mượn sách, hãy giải thích: Sinh viên gửi yêu cầu trực tuyến trên web -> Thủ thư duyệt -> Sinh viên nhận mã QR trên mail/in-app -> Sinh viên đến thư viện đưa thủ thư quét QR để nhận sách. Thời hạn nhận sách là 24 giờ.\n"
            . "5. Nếu sách họ muốn mượn đã hết (available_quantity = 0), hãy nhắc họ có thể click vào chi tiết sách để sử dụng tính năng 'Đặt chỗ trước' (Reservation Queue) để xếp hàng chờ tự động.\n"
            . ($member
                ? "6. Bạn được cung cấp các công cụ (Tools) để xem sách đang mượn (getMyBorrowings), xem tiền phạt (getMyFines), và xem lịch đặt phòng tự học (getMyRoomBookings) của sinh viên này. Hãy gọi công cụ khi họ hỏi về thông tin cá nhân của họ."
                : "6. Người dùng hiện chưa đăng nhập. Nếu họ hỏi về thông tin cá nhân (lịch sử mượn, tiền phạt, phòng tự học), hãy nhắc họ đăng nhập để xem thông tin đó."
            );

        // Declare tools schema for Gemini
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

        if ($apiKey) {
            try {
                // Map history items into Gemini API roles
                $contents = [];
                foreach ($history as $chatItem) {
                    if (empty($chatItem['text']) || trim($chatItem['text']) === '') {
                        continue;
                    }
                    $role = ($chatItem['sender'] === 'user' || $chatItem['sender'] === 'model') ? $chatItem['sender'] : 'model';
                    // Normalize user/model role name
                    if ($role === 'ai') {
                        $role = 'model';
                    }
                    $contents[] = [
                        'role' => $role,
                        'parts' => [['text' => $chatItem['text']]]
                    ];
                }

                // Add current message
                $contents[] = [
                    'role' => 'user',
                    'parts' => [['text' => $message]]
                ];

                // Check if user is asking about personal details that require tools
                // Only attempt function-calling if the user is authenticated
                $normalizedMsg = mb_strtolower($message, 'UTF-8');
                $needsTools = $member && Str::contains($normalizedMsg, [
                    'của tôi', 'cá nhân', 'tôi mượn', 'đang mượn', 'lịch sử mượn',
                    'tiền phạt', 'phạt', 'đóng phạt', 'nợ phạt',
                    'đặt phòng', 'phòng tự học', 'phòng nhóm', 'lịch đặt phòng', 'phòng của tôi'
                ]);

                if ($needsTools) {
                    // Recursively resolve any function calls from Gemini
                    $resolvedContents = $this->resolveFunctionCalls($contents, $apiKey, $systemPrompt, $tools, $member);

                    if (isset($resolvedContents['error'])) {
                        Log::error('Function calling resolution failed: ' . $resolvedContents['error']);
                        // Immediately stream offline fallback if Gemini API call failed
                        return response()->stream(function () use ($message) {
                            $this->streamOfflineFallbackData($message);
                        }, 200, [
                            'Content-Type' => 'text/event-stream',
                            'Cache-Control' => 'no-cache',
                            'Connection' => 'keep-alive',
                            'X-Accel-Buffering' => 'no',
                        ]);
                    }
                } else {
                    $resolvedContents = $contents;
                }

                // Now stream the final response using streamGenerateContent
                return response()->stream(function () use ($apiKey, $resolvedContents, $systemPrompt, $message) {
                    $postData = [
                        'systemInstruction' => [
                            'parts' => [['text' => $systemPrompt]]
                        ],
                        'contents' => $resolvedContents,
                        'generationConfig' => [
                            'temperature' => 0.5,
                            'maxOutputTokens' => 1000,
                        ]
                    ];

                    $ch = curl_init();
                    $model = env('GEMINI_MODEL', 'gemini-1.5-flash');
                    curl_setopt($ch, CURLOPT_URL, "https://generativelanguage.googleapis.com/v1beta/models/{$model}:streamGenerateContent?alt=sse&key={$apiKey}");
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
                    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                    
                    $isError = false;
                    $errorBuffer = '';
                    $firstChunkChecked = false;

                    // Buffer function to echo chunks immediately to client
                    curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $data) use (&$isError, &$errorBuffer, &$firstChunkChecked) {
                        // On the very first chunk, check if it is a JSON error object
                        // (Gemini returns {"error":{...}} on failures, NOT valid SSE data)
                        if (!$firstChunkChecked) {
                            $firstChunkChecked = true;
                            $trimmed = trim($data);
                            // A real error response looks like {"error": ...} with no 'data:' prefix
                            if (strpos($trimmed, '{') === 0) {
                                $decoded = json_decode($trimmed, true);
                                if (is_array($decoded) && isset($decoded['error'])) {
                                    $isError = true;
                                    $errorBuffer .= $data;
                                    return strlen($data); // consume but don't echo
                                }
                            }
                        }

                        if ($isError) {
                            $errorBuffer .= $data;
                            return strlen($data); // consume remaining error data
                        }

                        echo $data;
                        if (ob_get_level() > 0) {
                            ob_flush();
                        }
                        flush();
                        return strlen($data);
                    });

                    $res = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);

                    if ($isError || $httpCode !== 200 || $res === false) {
                        $errDetail = $errorBuffer ?: (curl_error($ch) ?: "cURL execution failed, HTTP {$httpCode}");
                        Log::error("Gemini SSE API stream failed. HTTP Code: {$httpCode}, Raw Error: " . $errDetail);
                        $this->streamOfflineFallbackData($message, $errDetail);
                    }
                }, 200, [
                    'Content-Type' => 'text/event-stream',
                    'Cache-Control' => 'no-cache',
                    'Connection' => 'keep-alive',
                    'X-Accel-Buffering' => 'no',
                ]);

            } catch (\Exception $e) {
                Log::error('Gemini Stream Exception: ' . $e->getMessage());
            }
        }

        // --- FALLBACK OFFLINE STREAMING SEARCH ENGINE ---
        return response()->stream(function () use ($message) {
            $this->streamOfflineFallbackData($message);
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function streamOfflineFallbackData(string $message, ?string $errorMessage = null): void
    {
        $normalizedMsg = mb_strtolower($message, 'UTF-8');
        $responseText = "";

        if ($this->isGreetingMessage($normalizedMsg)) {
            $responseText = "Xin chào bạn! Tôi là **Thủ thư AI** của Thư viện HCMUE. 📚\n\nTôi có thể giúp bạn:\n"
                . "* 🔍 Tìm kiếm sách theo từ khóa hoặc thể loại.\n"
                . "* 💡 Gợi ý sách hay phù hợp với ngành học.\n"
                . "* 📋 Giải đáp thắc mắc về quy trình mượn trả và đặt chỗ sách vật lý.\n\nBạn muốn tìm tài liệu về chủ đề gì hôm nay?";
        } elseif (Str::contains($normalizedMsg, ['quy trình', 'mượn sách', 'nhận sách', 'quét', 'qr', 'hướng dẫn mượn'])) {
            $responseText = "### Quy trình mượn sách tại thư viện:\n\n"
                . "1. **Yêu cầu trực tuyến**: Bạn truy cập trang **Danh mục**, chọn cuốn sách muốn mượn và click **Mượn ngay**.\n"
                . "2. **Thủ thư phê duyệt**: Yêu cầu sẽ gửi đến hệ thống quản lý. Khi được duyệt, bạn sẽ nhận được thông báo in-app và email kèm mã QR.\n"
                . "3. **Nhận sách**: Bạn đến thư viện, trình mã QR của phiếu mượn (trong mục *Yêu cầu của tôi* hoặc email) cho thủ thư quét để nhận sách trực tiếp. Bạn có **24 giờ** để đến nhận sách kể từ khi được duyệt.";
        } elseif (Str::contains($normalizedMsg, ['đặt chỗ', 'hết sách', 'chờ', 'hàng đợi', 'reservation'])) {
            $responseText = "### Tính năng Đặt chỗ trước (Reservation Queue):\n\n"
                . "Khi một cuốn sách bạn thích đã **hết bản sẵn có** (số lượng khả dụng bằng 0):\n"
                . "1. Hãy click vào chi tiết cuốn sách đó trên trang **Danh mục**.\n"
                . "2. Bạn sẽ thấy nút **\"Đặt chỗ trước\"** kèm theo vị trí của bạn trong hàng đợi hiện tại.\n"
                . "3. Click đặt chỗ, bạn sẽ được xếp vào hàng đợi chờ tự động.\n"
                . "4. Khi người mượn trước trả sách, hệ thống sẽ tự động duyệt phiếu mượn cho bạn (người xếp thứ nhất) và gửi thông báo. Bạn có 24h để qua nhận sách!";
        } else {
            // Check database keywords
            $matchedBooks = Book::query()->where('is_digital', false)
                ->where(function ($q) use ($normalizedMsg) {
                    $q->where('title', 'like', "%{$normalizedMsg}%")
                      ->orWhere('genre', 'like', "%{$normalizedMsg}%")
                      ->orWhere('author', 'like', "%{$normalizedMsg}%");
                })->limit(3)->get();

            if ($matchedBooks->isNotEmpty()) {
                $bookLines = $matchedBooks->map(function ($b) {
                    $statusStr = $b->available_quantity > 0 ? "Còn sách (Kệ: {$b->location})" : "Đã hết (có thể Đặt chỗ)";
                    return "* **{$b->title}** - Tác giả: *{$b->author}* [ID: {$b->book_id}] ({$statusStr})";
                })->join("\n");

                $responseText = "[Trợ lý ngoại tuyến] Tôi đã tìm thấy một số cuốn sách phù hợp liên quan đến từ khóa bạn vừa tìm kiếm:\n\n"
                    . $bookLines . "\n\n"
                    . "Bạn có thể gõ mã sách hoặc click vào cuốn sách trên màn hình Danh mục để xem chi tiết và đăng ký mượn ngay nhé! Nếu bạn cần hướng dẫn gì thêm, hãy cứ tự nhiên hỏi tôi.";
            } else {
                $responseText = "[Trợ lý ngoại tuyến] Cảm ơn bạn đã trò chuyện! Thư viện HCMUE có rất nhiều tài liệu phong phú thuộc nhiều ngành học.\n\n"
                    . "Bạn có thể thử tìm kiếm với các từ khóa cụ thể như: *\"Lập trình\"*, *\"Cơ sở dữ liệu\"*, *\"Giáo trình\"*... hoặc hỏi tôi về *\"Quy trình mượn sách\"* và *\"Cách đặt chỗ\"*.\n\nTôi luôn sẵn sàng hỗ trợ!";
            }
        }

        // Stream response text chunk by chunk to simulate streaming
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
            echo "data: " . json_encode($payload) . "\n\n";
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();
            usleep(40000); // 40ms pause
        }
        echo "data: [DONE]\n\n";
    }

    private function resolveFunctionCalls($contents, $apiKey, $systemPrompt, $tools, $member)
    {
        // Limit recursive function calling to 5 iterations
        for ($i = 0; $i < 5; $i++) {
            $model = env('GEMINI_MODEL', 'gemini-1.5-flash');
            $response = Http::post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
                'systemInstruction' => [
                    'parts' => [['text' => $systemPrompt]]
                ],
                'contents' => $contents,
                'tools' => $tools,
                'generationConfig' => [
                    'temperature' => 0.5,
                ]
            ]);

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
                // If there's no function call requested, we are done!
                return $contents;
            }

            // Append model's request to contents
            $contents[] = $candidate['content'];

            // Execute function calls
            $toolParts = [];
            foreach ($functionCalls as $call) {
                $name = $call['name'];
                $args = $call['args'] ?? [];
                
                $result = $this->executeFunction($name, $args, $member);

                $toolParts[] = [
                    'functionResponse' => [
                        'name' => $name,
                        'response' => [
                            'output' => $result
                        ]
                    ]
                ];
            }

            // Append tool responses
            $contents[] = [
                'role' => 'tool',
                'parts' => $toolParts
            ];
        }

        return ['error' => 'Exceeded maximum recursive tool calls'];
    }

    private function isGreetingMessage(string $normalizedMsg): bool
    {
        return preg_match('/(?:^|[^\p{L}])(?:chào|hello|hi|bắt đầu)(?:$|[^\p{L}])/u', $normalizedMsg) === 1;
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
            Log::error("Error executing function $name: " . $e->getMessage());
            return ['error' => 'Không thể thực thi hàm: ' . $e->getMessage()];
        }

        return ['error' => 'Hàm không hợp lệ hoặc chưa định nghĩa'];
    }
}
