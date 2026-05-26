<?php

namespace Database\Seeders;

use App\Support\BookClassification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdditionalBookImportSeeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = database_path('seeders/additional_mapping_data.json');
        if (!file_exists($jsonPath)) {
            $this->command->error("additional_mapping_data.json not found!");
            return;
        }

        $data = json_decode(file_get_contents($jsonPath), true);
        $books = [];

        $genreLocations = [
            'Khoa học Tự nhiên' => 'Kệ A1',
            'Công nghệ - Kỹ thuật' => 'Kệ C3',
            'Kinh tế - Lịch sử' => 'Kệ B1',
            'Văn học - Xã hội' => 'Kệ D1',
            'Tham khảo & Từ điển' => 'Kệ E1',
            'Ngoại ngữ & Ngoại văn' => 'Kệ F1',
            'Giáo trình Đại học' => 'Kệ G1',
            'Pháp luật & Chính trị' => 'Kệ H1',
            'Nghệ thuật & Thể thao' => 'Kệ I1',
            'Triết học & Tâm lý học' => 'Kệ J1',
        ];

        foreach ($data as $item) {
            $stt = $item['stt'];
            $bookId = 85 + $stt; // Continue from book_id 85 (previous import maximum)

            $cover = $item['cover'];
            if (!$cover) {
                // Fallback placeholder cover
                $cover = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600';
            }

            $classification = BookClassification::normalizePhysical(
                $item['genre'],
                $genreLocations[$item['genre']] ?? null,
            ) ?? BookClassification::normalizePhysical(BookClassification::FALLBACK_GENRE, null);

            $books[] = [
                'book_id' => $bookId,
                'title' => $item['title'],
                'author' => $item['author'],
                'genre' => $classification['genre'],
                'published_year' => $item['year'],
                'total_quantity' => $item['total'],
                'available_quantity' => $item['avail'],
                'is_available' => $item['avail'] > 0 ? 1 : 0,
                'cover' => $cover,
                'location' => $classification['location'],
                'is_digital' => 0,
                'resource_type' => null,
                'file_format' => null,
                'file_size' => null,
                'download_count' => 0,
                'file_path' => null,
                'file_url' => null,
            ];
        }

        DB::table('books')->upsert($books, ['book_id'], [
            'title',
            'author',
            'genre',
            'published_year',
            'total_quantity',
            'available_quantity',
            'is_available',
            'cover',
            'location',
            'is_digital',
            'resource_type',
            'file_format',
            'file_size',
            'download_count',
            'file_path',
            'file_url',
        ]);

        if (class_exists(\App\Services\BookCacheService::class)) {
            resolve(\App\Services\BookCacheService::class)->bump();
        }
    }
}
