<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BookSeeder extends Seeder
{
    public function run(): void
    {
        $books = [
            [
                'book_id' => 1,
                'title' => 'Giáo trình Tâm lý học Đại cương',
                'author' => 'Nhiều tác giả',
                'genre' => 'Giáo trình',
                'published_year' => 2022,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ G1',
                'is_digital' => 1,
                'resource_type' => 'Giáo trình',
                'file_format' => 'PDF',
                'file_size' => '5.2 MB',
                'download_count' => 1250,
                'total_quantity' => 4,
                'available_quantity' => 3,
            ],
            [
                'book_id' => 2,
                'title' => 'Lập trình Python cơ bản',
                'author' => 'TS. Nguyễn Mạnh Hùng',
                'genre' => 'Công nghệ thông tin',
                'published_year' => 2021,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C1',
                'is_digital' => 1,
                'resource_type' => 'Tài liệu',
                'file_format' => 'EPUB',
                'file_size' => '3.1 MB',
                'download_count' => 840,
                'total_quantity' => 3,
                'available_quantity' => 1,
            ],
            [
                'book_id' => 3,
                'title' => 'Tạp chí Giáo dục số 452',
                'author' => 'Bộ Giáo dục và Đào tạo',
                'genre' => 'Tạp chí',
                'published_year' => 2023,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600',
                'location' => 'Phòng Đọc Báo / Tạp Chí',
                'is_digital' => 1,
                'resource_type' => 'Bài giảng',
                'file_format' => 'SLIDES',
                'file_size' => '12.5 MB',
                'download_count' => 450,
                'total_quantity' => 5,
                'available_quantity' => 5,
            ],
            [
                'book_id' => 4,
                'title' => 'Nhập môn Trí tuệ Nhân tạo',
                'author' => 'Stuart Russell',
                'genre' => 'Công nghệ thông tin',
                'published_year' => 2020,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C1',
                'is_digital' => 1,
                'resource_type' => 'Sách nói',
                'file_format' => 'AUDIO',
                'file_size' => '45.0 MB',
                'download_count' => 3200,
                'total_quantity' => 6,
                'available_quantity' => 6,
            ],
            [
                'book_id' => 5,
                'title' => 'Vật lý Đại cương',
                'author' => 'Alonso Finn',
                'genre' => 'Giáo trình',
                'published_year' => 2018,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ G1',
                'is_digital' => 1,
                'resource_type' => 'Tham khảo',
                'file_format' => 'PDF',
                'file_size' => '8.4 MB',
                'download_count' => 2100,
                'total_quantity' => 4,
                'available_quantity' => 4,
            ],
            [
                'book_id' => 6,
                'title' => 'Cơ sở dữ liệu ứng dụng',
                'author' => 'PGS. Trần Quốc Bảo',
                'genre' => 'Công nghệ thông tin',
                'published_year' => 2022,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C2',
                'is_digital' => 1,
                'resource_type' => 'Giáo trình',
                'file_format' => 'PDF',
                'file_size' => '6.8 MB',
                'download_count' => 975,
                'total_quantity' => 5,
                'available_quantity' => 5,
            ],
            [
                'book_id' => 7,
                'title' => 'Kinh tế vi mô',
                'author' => 'N. Gregory Mankiw',
                'genre' => 'Kinh tế',
                'published_year' => 2020,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ B1',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 4,
                'available_quantity' => 4,
            ],
            [
                'book_id' => 8,
                'title' => 'Lịch sử Việt Nam hiện đại',
                'author' => 'GS. Phan Huy Lê',
                'genre' => 'Lịch sử',
                'published_year' => 2019,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ B2',
                'is_digital' => 1,
                'resource_type' => 'Tài liệu',
                'file_format' => 'PDF',
                'file_size' => '7.6 MB',
                'download_count' => 630,
                'total_quantity' => 3,
                'available_quantity' => 2,
            ],
            [
                'book_id' => 9,
                'title' => 'Phương pháp nghiên cứu khoa học',
                'author' => 'TS. Lê Thị Minh Châu',
                'genre' => 'Giáo trình',
                'published_year' => 2021,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ G2',
                'is_digital' => 1,
                'resource_type' => 'Bài giảng',
                'file_format' => 'SLIDES',
                'file_size' => '10.2 MB',
                'download_count' => 1120,
                'total_quantity' => 6,
                'available_quantity' => 6,
            ],
            [
                'book_id' => 10,
                'title' => 'Thiết kế giao diện người dùng',
                'author' => 'Jennifer Tidwell',
                'genre' => 'Thiết kế',
                'published_year' => 2023,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ I1',
                'is_digital' => 1,
                'resource_type' => 'Tham khảo',
                'file_format' => 'EPUB',
                'file_size' => '4.9 MB',
                'download_count' => 760,
                'total_quantity' => 4,
                'available_quantity' => 3,
            ],
            [
                'book_id' => 11,
                'title' => 'Mạng máy tính căn bản',
                'author' => 'Andrew S. Tanenbaum',
                'genre' => 'Công nghệ thông tin',
                'published_year' => 2020,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C2',
                'is_digital' => 1,
                'resource_type' => 'Sách nói',
                'file_format' => 'AUDIO',
                'file_size' => '38.5 MB',
                'download_count' => 540,
                'total_quantity' => 5,
                'available_quantity' => 4,
            ],
            [
                'book_id' => 12,
                'title' => 'Marketing căn bản',
                'author' => 'Philip Kotler',
                'genre' => 'Kinh tế',
                'published_year' => 2022,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ B1',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 3,
                'available_quantity' => 3,
            ],
            [
                'book_id' => 13,
                'title' => 'Tiếng Anh học thuật',
                'author' => 'Michael McCarthy',
                'genre' => 'Ngoại ngữ',
                'published_year' => 2021,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ F1',
                'is_digital' => 1,
                'resource_type' => 'Tài liệu',
                'file_format' => 'PDF',
                'file_size' => '5.7 MB',
                'download_count' => 890,
                'total_quantity' => 7,
                'available_quantity' => 7,
            ],
            [
                'book_id' => 14,
                'title' => 'Quản trị dự án phần mềm',
                'author' => 'Kathy Schwalbe',
                'genre' => 'Công nghệ thông tin',
                'published_year' => 2024,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C3',
                'is_digital' => 1,
                'resource_type' => 'Giáo trình',
                'file_format' => 'PDF',
                'file_size' => '9.3 MB',
                'download_count' => 410,
                'total_quantity' => 4,
                'available_quantity' => 4,
            ],
            [
                'book_id' => 15,
                'title' => 'Toán cao cấp A1',
                'author' => 'Nguyễn Đình Trí',
                'genre' => 'Giáo trình',
                'published_year' => 2018,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ G2',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 6,
                'available_quantity' => 6,
            ],
            [
                'book_id' => 16,
                'title' => 'Cấu trúc dữ liệu và giải thuật',
                'author' => 'Nguyễn Văn Minh',
                'genre' => 'Công nghệ thông tin',
                'published_year' => 2021,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C3',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 5,
                'available_quantity' => 5,
            ],
            [
                'book_id' => 17,
                'title' => 'Giải tích 1',
                'author' => 'Trần Đức Long',
                'genre' => 'Giáo trình',
                'published_year' => 2019,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ G3',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 6,
                'available_quantity' => 6,
            ],
            [
                'book_id' => 18,
                'title' => 'Hóa học đại cương',
                'author' => 'Lê Thu Trang',
                'genre' => 'Giáo trình',
                'published_year' => 2020,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ G3',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 4,
                'available_quantity' => 4,
            ],
            [
                'book_id' => 19,
                'title' => 'Kinh tế lượng cơ bản',
                'author' => 'Phạm Quốc Huy',
                'genre' => 'Kinh tế',
                'published_year' => 2022,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ B3',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 3,
                'available_quantity' => 3,
            ],
            [
                'book_id' => 20,
                'title' => 'Ngữ pháp tiếng Anh nâng cao',
                'author' => 'Raymond Murphy',
                'genre' => 'Ngoại ngữ',
                'published_year' => 2018,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ F2',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 5,
                'available_quantity' => 5,
            ],
            [
                'book_id' => 21,
                'title' => 'Văn học Việt Nam hiện đại',
                'author' => 'Nguyễn Đăng Mạnh',
                'genre' => 'Văn học',
                'published_year' => 2017,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ D1',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 4,
                'available_quantity' => 4,
            ],
            [
                'book_id' => 22,
                'title' => 'Xác suất thống kê ứng dụng',
                'author' => 'Phan Thanh Nam',
                'genre' => 'Giáo trình',
                'published_year' => 2021,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ G4',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 6,
                'available_quantity' => 6,
            ],
            [
                'book_id' => 23,
                'title' => 'Kỹ năng thuyết trình',
                'author' => 'Lê Minh Phương',
                'genre' => 'Kỹ năng',
                'published_year' => 2020,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ J1',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 3,
                'available_quantity' => 3,
            ],
            [
                'book_id' => 24,
                'title' => 'Thiết kế cơ sở dữ liệu',
                'author' => 'Nguyễn Hải Đăng',
                'genre' => 'Công nghệ thông tin',
                'published_year' => 2022,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C1',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 5,
                'available_quantity' => 5,
            ],
            [
                'book_id' => 25,
                'title' => 'An ninh mạng căn bản',
                'author' => 'Trương Quốc Bảo',
                'genre' => 'Công nghệ thông tin',
                'published_year' => 2023,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C2',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 4,
                'available_quantity' => 4,
            ],
            [
                'book_id' => 26,
                'title' => 'Tài chính doanh nghiệp',
                'author' => 'Nguyễn Hữu Thọ',
                'genre' => 'Kinh tế',
                'published_year' => 2020,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ B4',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 5,
                'available_quantity' => 5,
            ],
            [
                'book_id' => 27,
                'title' => 'Hành vi tổ chức',
                'author' => 'Stephen P. Robbins',
                'genre' => 'Kinh tế',
                'published_year' => 2019,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ B4',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 3,
                'available_quantity' => 3,
            ],
            [
                'book_id' => 28,
                'title' => 'Tư duy phản biện',
                'author' => 'Nguyễn Thị Thu Hà',
                'genre' => 'Kỹ năng',
                'published_year' => 2021,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ J1',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 6,
                'available_quantity' => 6,
            ],
            [
                'book_id' => 29,
                'title' => 'Cơ sở mạng máy tính',
                'author' => 'James F. Kurose',
                'genre' => 'Công nghệ thông tin',
                'published_year' => 2020,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C3',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 4,
                'available_quantity' => 4,
            ],
            [
                'book_id' => 30,
                'title' => 'Lập trình Java căn bản',
                'author' => 'Lê Quang Hưng',
                'genre' => 'Công nghệ thông tin',
                'published_year' => 2022,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C3',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 5,
                'available_quantity' => 5,
            ],
            [
                'book_id' => 31,
                'title' => 'Kỹ thuật số',
                'author' => 'Đặng Quốc Vinh',
                'genre' => 'Điện - Điện tử',
                'published_year' => 2018,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C2',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 3,
                'available_quantity' => 3,
            ],
            [
                'book_id' => 32,
                'title' => 'Vật liệu học cơ bản',
                'author' => 'Nguyễn Đức Thành',
                'genre' => 'Kỹ thuật',
                'published_year' => 2019,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ C3',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 4,
                'available_quantity' => 4,
            ],
            [
                'book_id' => 33,
                'title' => 'Tâm lý học phát triển',
                'author' => 'Hoàng Thị Kim',
                'genre' => 'Tâm lý',
                'published_year' => 2020,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ J2',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 5,
                'available_quantity' => 5,
            ],
            [
                'book_id' => 34,
                'title' => 'Pháp luật đại cương',
                'author' => 'Trịnh Văn Sơn',
                'genre' => 'Luật',
                'published_year' => 2017,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ H1',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 4,
                'available_quantity' => 4,
            ],
            [
                'book_id' => 35,
                'title' => 'Quản trị nhân sự',
                'author' => 'Nguyễn Thị Lan',
                'genre' => 'Kinh tế',
                'published_year' => 2021,
                'is_available' => 1,
                'cover' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600',
                'location' => 'Kệ B5',
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'total_quantity' => 5,
                'available_quantity' => 5,
            ],
        ];

        DB::table('books')->upsert($books, ['book_id'], [
            'title',
            'author',
            'genre',
            'published_year',
            'is_available',
            'cover',
            'location',
            'is_digital',
            'resource_type',
            'file_format',
            'file_size',
            'download_count',
            'total_quantity',
            'available_quantity',
        ]);

        $this->attachDigitalFiles($books);
    }

    private function attachDigitalFiles(array $books): void
    {
        $storage = Storage::disk('local');

        foreach ($books as $book) {
            if (empty($book['is_digital'])) {
                continue;
            }

            $existing = DB::table('books')
                ->where('book_id', $book['book_id'])
                ->first(['file_path', 'file_url']);

            if (! $existing || $existing->file_path || $existing->file_url) {
                continue;
            }

            $extension = $this->digitalFileExtension($book['file_format'] ?? null);
            $filePath = 'digital-documents/'.$book['book_id'].'/tai-lieu.'.$extension;

            $this->writeDigitalFile($storage, $filePath, $extension, $book);

            DB::table('books')
                ->where('book_id', $book['book_id'])
                ->update([
                    'file_path' => $filePath,
                    'file_url' => null,
                ]);
        }
    }

    private function digitalFileExtension(?string $format): string
    {
        return match (strtoupper((string) $format)) {
            'EPUB' => 'epub',
            'AUDIO' => 'wav',
            'SLIDES' => 'txt',
            default => 'pdf',
        };
    }

    private function writeDigitalFile($storage, string $filePath, string $extension, array $book): void
    {
        $storage->makeDirectory(dirname($filePath));

        if ($extension === 'pdf') {
            $storage->put($filePath, $this->buildPdfContent($book));
            return;
        }

        if ($extension === 'epub') {
            $this->buildEpubFile($filePath, $book);
            return;
        }

        if ($extension === 'wav') {
            $storage->put($filePath, $this->buildWavContent());
            return;
        }

        $storage->put($filePath, $this->buildSlidesContent($book));
    }

    private function buildPdfContent(array $book): string
    {
        $lines = [
            'Thư viện số HCMUE',
            'Tài liệu số',
            '',
            'Tiêu đề: '.(string) ($book['title'] ?? 'Tài liệu số'),
            'Tác giả: '.(string) ($book['author'] ?? 'Không rõ'),
            'Định dạng: '.(string) ($book['file_format'] ?? 'Chưa cập nhật'),
            'Loại tài nguyên: '.(string) ($book['resource_type'] ?? $book['genre'] ?? 'Chưa cập nhật'),
            '',
            'Nội dung tài liệu số.',
        ];

        $content = "BT\n/F1 14 Tf\n72 720 Td\n";
        foreach ($lines as $line) {
            $content .= '<'.$this->pdfTextHex($line)."> Tj\n";
            $content .= "0 -18 Td\n";
        }
        $content .= "ET\n";

        $objects = [
            "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
            "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
            "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
            "4 0 obj\n<< /Length ".strlen($content)." >>\nstream\n".$content."endstream\nendobj\n",
            "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object;
        }

        $xrefPosition = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n";
        $pdf .= "0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= "trailer\n<< /Size ".(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n".$xrefPosition."\n%%EOF\n";

        return $pdf;
    }

    private function buildEpubFile(string $filePath, array $book): void
    {
        if (! class_exists('ZipArchive')) {
            Storage::disk('local')->put($filePath, $this->buildSlidesContent($book));
            return;
        }

        $fullPath = storage_path('app/'.$filePath);
        $zip = new \ZipArchive();

        if ($zip->open($fullPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            Storage::disk('local')->put($filePath, $this->buildSlidesContent($book));
            return;
        }

        $title = $this->escapeXml((string) ($book['title'] ?? 'Tài liệu số'));
        $author = $this->escapeXml((string) ($book['author'] ?? 'Không rõ'));

        $zip->addFromString('mimetype', 'application/epub+zip');
        $zip->setCompressionName('mimetype', \ZipArchive::CM_STORE);
        $zip->addFromString('META-INF/container.xml',
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n".
            "<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">\n".
            "  <rootfiles>\n".
            "    <rootfile full-path=\"OEBPS/content.opf\" media-type=\"application/oebps-package+xml\"/>\n".
            "  </rootfiles>\n".
            "</container>\n"
        );
        $zip->addFromString('OEBPS/content.opf',
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n".
            "<package xmlns=\"http://www.idpf.org/2007/opf\" unique-identifier=\"BookId\" version=\"3.0\">\n".
            "  <metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n".
            "    <dc:identifier id=\"BookId\">book-".$book['book_id']."</dc:identifier>\n".
            "    <dc:title>".$title."</dc:title>\n".
            "    <dc:creator>".$author."</dc:creator>\n".
            "    <dc:language>vi</dc:language>\n".
            "  </metadata>\n".
            "  <manifest>\n".
            "    <item id=\"content\" href=\"content.xhtml\" media-type=\"application/xhtml+xml\"/>\n".
            "  </manifest>\n".
            "  <spine>\n".
            "    <itemref idref=\"content\"/>\n".
            "  </spine>\n".
            "</package>\n"
        );
        $zip->addFromString('OEBPS/content.xhtml',
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n".
            "<!DOCTYPE html>\n".
            "<html xmlns=\"http://www.w3.org/1999/xhtml\" lang=\"vi\">\n".
            "  <head><title>".$title."</title></head>\n".
            "  <body>\n".
            "    <h1>".$title."</h1>\n".
            "    <p><strong>Tác giả:</strong> ".$author."</p>\n".
            "    <p>Nội dung tài liệu số.</p>\n".
            "  </body>\n".
            "</html>\n"
        );

        $zip->close();
    }

    private function buildWavContent(int $durationSeconds = 1): string
    {
        $sampleRate = 8000;
        $numChannels = 1;
        $bitsPerSample = 8;
        $dataSize = $sampleRate * $durationSeconds * $numChannels * ($bitsPerSample / 8);
        $byteRate = $sampleRate * $numChannels * ($bitsPerSample / 8);
        $blockAlign = $numChannels * ($bitsPerSample / 8);

        $header = 'RIFF'.pack('V', 36 + $dataSize).'WAVE';
        $header .= 'fmt '.pack('VvvVVvv', 16, 1, $numChannels, $sampleRate, $byteRate, $blockAlign, $bitsPerSample);
        $header .= 'data'.pack('V', $dataSize);

        return $header.str_repeat(chr(128), $dataSize);
    }

    private function buildSlidesContent(array $book): string
    {
        $title = $book['title'] ?? 'Tài liệu số';
        $author = $book['author'] ?? 'Không rõ';
        $format = $book['file_format'] ?? 'Chưa cập nhật';
        $type = $book['resource_type'] ?? $book['genre'] ?? 'Chưa cập nhật';

        return implode(PHP_EOL, [
            'Thư viện số HCMUE',
            'Tài liệu số',
            '',
            'Tiêu đề: '.$title,
            'Tác giả: '.$author,
            'Định dạng: '.$format,
            'Loại tài nguyên: '.$type,
            '',
            'Đây là tệp tài liệu số.',
        ]);
    }

    private function pdfTextHex(string $value): string
    {
        $encoded = iconv('UTF-8', 'UTF-16BE//IGNORE', $value);

        if ($encoded === false) {
            $encoded = $value;
        }

        return 'FEFF'.strtoupper(bin2hex($encoded));
    }

    private function escapeXml(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
