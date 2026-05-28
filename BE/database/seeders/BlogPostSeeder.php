<?php

namespace Database\Seeders;

use App\Models\BlogPost;
use App\Models\Librarian;
use Illuminate\Database\Seeder;

class BlogPostSeeder extends Seeder
{
    public function run(): void
    {
        // Don't duplicate posts if already seeded
        if (BlogPost::query()->exists()) {
            return;
        }

        $author = Librarian::query()->first();
        if (!$author) {
            return;
        }

        $posts = [
            [
                'title' => 'Khai trương phòng tự học thông minh thế hệ mới tại HCMUE',
                'slug' => 'khai-truong-phong-tu-hoc-thong-minh-the-he-moi',
                'excerpt' => 'Thư viện trường Đại học Sư phạm TP.HCM chính thức đưa vào hoạt động phòng tự học thông minh với trang thiết bị hiện đại, hệ thống đặt phòng trực tuyến tiện lợi.',
                'content' => '<h2>Không gian học tập hiện đại 4.0</h2><p>Nhằm đáp ứng nhu cầu ngày càng cao về không gian nghiên cứu và làm việc nhóm của sinh viên, Thư viện trường Đại học Sư phạm TP.HCM (HCMUE) đã chính thức khánh thành và đưa vào hoạt động chuỗi phòng tự học thông minh thế hệ mới.</p><h3>Các tiện ích nổi bật bao gồm:</h3><ul><li>Hệ thống máy tính cấu hình cao phục vụ tra cứu học liệu số.</li><li>Wi-Fi tốc độ cao thế hệ mới phủ sóng toàn bộ phòng học.</li><li>Màn hình trình chiếu thông minh tích hợp kết nối không dây.</li><li>Hệ thống cách âm tiêu chuẩn, bảng viết di động tiện lợi cho thảo luận.</li></ul><p>Sinh viên có thể dễ dàng đặt phòng trước thông qua tính năng "Đặt phòng học nhóm" trực tiếp trên hệ thống Thư viện số mới ra mắt.</p>',
                'cover_image' => 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=1000',
                'category' => 'event',
                'status' => 'published',
                'is_pinned' => true,
                'author_id' => $author->getKey(),
                'author_type' => Librarian::class,
                'views' => 142,
                'published_at' => now()->subDays(5),
            ],
            [
                'title' => 'Giới thiệu bộ sách "Tâm lý học giáo dục học đường" mới nhập kho',
                'slug' => 'gioi-thieu-bo-sach-tam-ly-hoc-giao-duc-hoc-duong',
                'excerpt' => 'Giới thiệu chi tiết về bộ giáo trình và tài liệu nghiên cứu chuyên sâu về Tâm lý học giáo dục học đường vừa được cập nhật tại thư viện HCMUE.',
                'content' => '<h2>Tài liệu tham khảo chuyên sâu cho ngành Sư phạm</h2><p>Bộ sách "Tâm lý học giáo dục học đường" là tài liệu nghiên cứu vô cùng giá trị dành cho các giảng viên và sinh viên thuộc khối ngành Sư phạm và Tâm lý học giáo dục. Bộ sách tập trung phân tích sâu sắc về sự phát triển tâm sinh lý của học sinh trong môi trường học đường hiện đại.</p><h3>Nội dung chính của bộ giáo trình:</h3><ol><li><strong>Tập 1:</strong> Cơ sở lý luận của tâm lý học giáo dục thế kỷ 21.</li><li><strong>Tập 2:</strong> Các phương pháp hỗ trợ và can thiệp tâm lý học đường thực tiễn.</li><li><strong>Tập 3:</strong> Vai trò của giáo viên trong việc định hình môi trường lớp học tích cực.</li></ol><p>Hiện sách vật lý đã sẵn sàng trên kệ tại khu vực tài liệu Sư phạm. Phiên bản ebook (tài liệu số) cũng đã được tải lên danh mục tài liệu trực tuyến để bạn đọc nghiên cứu từ xa.</p>',
                'cover_image' => 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=1000',
                'category' => 'review',
                'status' => 'published',
                'is_pinned' => false,
                'author_id' => $author->getKey(),
                'author_type' => Librarian::class,
                'views' => 95,
                'published_at' => now()->subDays(3),
            ],
            [
                'title' => 'Hướng dẫn đăng ký mượn trả tài liệu số qua cổng trực tuyến',
                'slug' => 'huong-dan-dang-ky-muon-tra-tai-lieu-so-truc-tuyen',
                'excerpt' => 'Từng bước hướng dẫn chi tiết giúp sinh viên dễ dàng truy cập, đọc trực tuyến và mượn các tài liệu số (Ebook, Luận văn, Bài báo khoa học) từ Thư viện số HCMUE.',
                'content' => '<h2>Tiện ích đọc sách số mọi lúc mọi nơi</h2><p>Nhằm tối ưu hóa trải nghiệm đọc sách, Thư viện số HCMUE cho phép bạn đọc mượn và xem trực tuyến hàng ngàn tài liệu số chất lượng cao mà không cần đến trực tiếp thư viện. Dưới đây là các bước thao tác đơn giản:</p><h3>Quy trình 3 bước mượn sách số:</h3><ol><li><strong>Bước 1:</strong> Đăng nhập hệ thống Thư viện số bằng email sinh viên (@student.hcmue.edu.vn).</li><li><strong>Bước 2:</strong> Truy cập danh mục "Tài liệu số" hoặc tìm kiếm sách có nhãn "Tài liệu số" và nhấn "Mượn sách".</li><li><strong>Bước 3:</strong> Sau khi hệ thống duyệt, bạn có thể đọc trực tuyến trực tiếp trên trình duyệt hoặc lưu ngoại tuyến trên tài khoản của mình.</li></ol><p>Mọi thắc mắc trong quá trình thao tác vui lòng gửi email về ban quản trị thư viện hoặc chat trực tiếp với trợ lý AI Gemini ngay ở góc phải màn hình.</p>',
                'cover_image' => 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1000',
                'category' => 'guide',
                'status' => 'published',
                'is_pinned' => false,
                'author_id' => $author->getKey(),
                'author_type' => Librarian::class,
                'views' => 218,
                'published_at' => now()->subDays(1),
            ],
        ];

        foreach ($posts as $post) {
            BlogPost::query()->create($post);
        }
    }
}
