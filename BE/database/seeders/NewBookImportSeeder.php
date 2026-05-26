<?php

namespace Database\Seeders;

use App\Support\BookClassification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NewBookImportSeeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = database_path('seeders/mapping_data.json');
        if (!file_exists($jsonPath)) {
            $this->command->error("mapping_data.json not found!");
            return;
        }

        $data = json_decode(file_get_contents($jsonPath), true);
        $books = [];

        $genreLocations = [
            'Công nghệ thông tin' => 'Kệ C3',
            'Văn học' => 'Kệ D1',
            'Lịch sử' => 'Kệ B2',
            'Kỹ năng' => 'Kệ J1',
            'Tâm lý' => 'Kệ J2',
            'Kinh tế' => 'Kệ B1',
            'Giáo trình' => 'Kệ G1',
        ];

        foreach ($data as $item) {
            $stt = $item['stt'];
            $bookId = 35 + $stt;

            // For Sự Im Lặng (stt: 2), force the screenshot PNG cover
            $cover = $item['cover'];
            if ($stt === 2) {
                $cover = 'covers/sach-isbn-16001.png';
            }

            // Fallback cover if download failed
            if (!$cover) {
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
