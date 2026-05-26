<?php

namespace App\Support;

use Illuminate\Support\Str;

final class BookClassification
{
    public const FALLBACK_GENRE = 'Tham khảo & Từ điển';

    public const GROUPS = [
        'A' => [
            'genre' => 'Khoa học Tự nhiên',
            'shelves' => ['A1', 'A2', 'A3', 'A4'],
            'aliases' => [
                'Khoa học Tự nhiên',
                'Khoa học',
                'KHTN',
                'Science',
                'Natural Science',
                'Natural Sciences',
                'Toán',
                'Vật lý',
                'Hóa học',
                'Sinh học',
            ],
        ],
        'B' => [
            'genre' => 'Kinh tế - Lịch sử',
            'shelves' => ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
            'aliases' => [
                'Kinh tế - Lịch sử',
                'Kinh tế',
                'Lịch sử',
                'KT-LS',
                'Economics',
                'History',
                'Business',
                'Finance',
                'Marketing',
            ],
        ],
        'C' => [
            'genre' => 'Công nghệ - Kỹ thuật',
            'shelves' => ['C1', 'C2', 'C3'],
            'aliases' => [
                'Công nghệ - Kỹ thuật',
                'Công nghệ thông tin',
                'CNTT',
                'Công nghệ',
                'Kỹ thuật',
                'Điện - Điện tử',
                'Technology',
                'Engineering',
                'Computer Science',
                'Information Technology',
                'IT',
            ],
        ],
        'D' => [
            'genre' => 'Văn học - Xã hội',
            'shelves' => ['D1', 'D2', 'D3', 'D4'],
            'aliases' => [
                'Văn học - Xã hội',
                'Văn học',
                'Xã hội',
                'VH-XH',
                'Fiction',
                'Literature',
                'Social Science',
                'Social Sciences',
                'Society',
            ],
        ],
        'E' => [
            'genre' => 'Tham khảo & Từ điển',
            'shelves' => ['E1', 'E2', 'E3'],
            'aliases' => [
                'Tham khảo & Từ điển',
                'Tham khảo',
                'Từ điển',
                'Tạp chí',
                'Báo',
                'Báo cáo',
                'Reference',
                'Dictionary',
                'Magazine',
                'Journal',
                'Report',
                'Research',
                'Nghiên cứu',
            ],
        ],
        'F' => [
            'genre' => 'Ngoại ngữ & Ngoại văn',
            'shelves' => ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
            'aliases' => [
                'Ngoại ngữ & Ngoại văn',
                'Ngoại ngữ',
                'Ngoại văn',
                'Ngôn ngữ học',
                'Language',
                'Foreign Language',
                'English',
                'Linguistics',
            ],
        ],
        'G' => [
            'genre' => 'Giáo trình Đại học',
            'shelves' => ['G1', 'G2', 'G3', 'G4'],
            'aliases' => [
                'Giáo trình Đại học',
                'Giáo trình',
                'Textbook',
                'Coursebook',
                'Lecture',
                'Bài giảng',
            ],
        ],
        'H' => [
            'genre' => 'Pháp luật & Chính trị',
            'shelves' => ['H1', 'H2', 'H3'],
            'aliases' => [
                'Pháp luật & Chính trị',
                'Pháp luật',
                'Chính trị',
                'Luật',
                'Law',
                'Politics',
                'Political',
            ],
        ],
        'I' => [
            'genre' => 'Nghệ thuật & Thể thao',
            'shelves' => ['I1', 'I2'],
            'aliases' => [
                'Nghệ thuật & Thể thao',
                'Nghệ thuật',
                'Thể thao',
                'Thiết kế',
                'Mỹ thuật',
                'Design',
                'Art',
                'Sport',
                'Sports',
            ],
        ],
        'J' => [
            'genre' => 'Triết học & Tâm lý học',
            'shelves' => ['J1', 'J2', 'J3'],
            'aliases' => [
                'Triết học & Tâm lý học',
                'Triết học',
                'Tâm lý',
                'Tâm lý học',
                'Kỹ năng',
                'Kỹ năng sống',
                'Psychology',
                'Philosophy',
                'Skills',
                'Self Help',
            ],
        ],
    ];

    public static function canonicalGenres(): array
    {
        return array_map(static fn (array $group): string => $group['genre'], self::GROUPS);
    }

    public static function normalizePhysical(?string $genre, ?string $location): ?array
    {
        $hasGenreInput = trim((string) $genre) !== '';
        $canonicalGenre = self::normalizeGenre($genre);
        $shelfCode = self::shelfCodeFromLocation($location);

        if ($hasGenreInput && $canonicalGenre === null) {
            return null;
        }

        if ($canonicalGenre === null && $shelfCode !== null) {
            $canonicalGenre = self::genreForShelf($shelfCode);
        }

        if ($canonicalGenre === null) {
            return null;
        }

        return [
            'genre' => $canonicalGenre,
            'location' => self::normalizeLocation($location, $canonicalGenre),
        ];
    }

    public static function normalizeGenre(?string $genre): ?string
    {
        $normalized = self::normalizeText($genre);

        if ($normalized === '') {
            return null;
        }

        foreach (self::GROUPS as $group) {
            foreach ([$group['genre'], ...$group['aliases']] as $alias) {
                if ($normalized === self::normalizeText($alias)) {
                    return $group['genre'];
                }
            }
        }

        return null;
    }

    public static function normalizeLocation(?string $location, string $genre): string
    {
        $groupCode = self::groupCodeForGenre($genre);
        $shelfCode = self::shelfCodeFromLocation($location);

        if (
            $groupCode !== null
            && $shelfCode !== null
            && in_array($shelfCode, self::GROUPS[$groupCode]['shelves'], true)
        ) {
            return 'Kệ '.$shelfCode;
        }

        return self::defaultLocationForGenre($genre);
    }

    public static function defaultLocationForGenre(string $genre): string
    {
        $groupCode = self::groupCodeForGenre($genre) ?? self::groupCodeForGenre(self::FALLBACK_GENRE);
        $firstShelf = self::GROUPS[$groupCode]['shelves'][0];

        return 'Kệ '.$firstShelf;
    }

    public static function shelfCodeFromLocation(?string $location): ?string
    {
        $value = trim((string) $location);

        if ($value === '') {
            return null;
        }

        $ascii = Str::upper(Str::ascii($value));

        if (! preg_match('/\b([A-J])\s*[-_ ]?\s*0*(\d{1,2})\b/', $ascii, $matches)) {
            return null;
        }

        return $matches[1].((int) $matches[2]);
    }

    public static function genreForShelf(string $shelfCode): ?string
    {
        $prefix = Str::upper(substr($shelfCode, 0, 1));

        return self::GROUPS[$prefix]['genre'] ?? null;
    }

    public static function groupCodeForGenre(string $genre): ?string
    {
        $canonicalGenre = self::normalizeGenre($genre);

        foreach (self::GROUPS as $code => $group) {
            if ($group['genre'] === $canonicalGenre) {
                return $code;
            }
        }

        return null;
    }

    private static function normalizeText(?string $value): string
    {
        $ascii = Str::ascii(trim((string) $value));
        $lower = Str::lower($ascii);
        $collapsed = preg_replace('/[^a-z0-9]+/i', ' ', $lower) ?? '';

        return trim(preg_replace('/\s+/', ' ', $collapsed) ?? '');
    }
}
