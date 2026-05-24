<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $locations = [
            1 => 'Kệ G1',
            2 => 'Kệ C1',
            3 => 'Phòng Đọc Báo / Tạp Chí',
            4 => 'Kệ C1',
            5 => 'Kệ G1',
            6 => 'Kệ C2',
            7 => 'Kệ B1',
            8 => 'Kệ B2',
            9 => 'Kệ G2',
            10 => 'Kệ I1',
            11 => 'Kệ C2',
            12 => 'Kệ B1',
            13 => 'Kệ F1',
            14 => 'Kệ C3',
            15 => 'Kệ G2',
            16 => 'Kệ C3',
            17 => 'Kệ G3',
            18 => 'Kệ G3',
            19 => 'Kệ B3',
            20 => 'Kệ F2',
            21 => 'Kệ D1',
            22 => 'Kệ G4',
            23 => 'Kệ J1',
            24 => 'Kệ C1',
            25 => 'Kệ C2',
            26 => 'Kệ B4',
            27 => 'Kệ B4',
            28 => 'Kệ J1',
            29 => 'Kệ C3',
            30 => 'Kệ C3',
            31 => 'Kệ C2',
            32 => 'Kệ C3',
            33 => 'Kệ J2',
            34 => 'Kệ H1',
            35 => 'Kệ B5',
        ];

        foreach ($locations as $id => $loc) {
            DB::table('books')
                ->where('book_id', $id)
                ->update(['location' => $loc]);
        }

        // Correct locations for other manually created or test books by genre
        DB::table('books')
            ->whereIn('genre', ['Công nghệ thông tin', 'CNTT', 'Kỹ thuật', 'Điện - Điện tử'])
            ->whereNotIn('book_id', array_keys($locations))
            ->update(['location' => 'Kệ C1']);

        DB::table('books')
            ->whereIn('genre', ['Kinh tế', 'Lịch sử'])
            ->whereNotIn('book_id', array_keys($locations))
            ->update(['location' => 'Kệ B1']);

        DB::table('books')
            ->where('genre', 'Giáo trình')
            ->whereNotIn('book_id', array_keys($locations))
            ->update(['location' => 'Kệ G1']);

        DB::table('books')
            ->where('genre', 'Tạp chí')
            ->whereNotIn('book_id', array_keys($locations))
            ->update(['location' => 'Phòng Đọc Báo / Tạp Chí']);

        DB::table('books')
            ->where('genre', 'Ngoại ngữ')
            ->whereNotIn('book_id', array_keys($locations))
            ->update(['location' => 'Kệ F1']);

        DB::table('books')
            ->where('genre', 'Văn học')
            ->whereNotIn('book_id', array_keys($locations))
            ->update(['location' => 'Kệ D1']);

        DB::table('books')
            ->where('genre', 'Luật')
            ->whereNotIn('book_id', array_keys($locations))
            ->update(['location' => 'Kệ H1']);

        DB::table('books')
            ->where('genre', 'Thiết kế')
            ->whereNotIn('book_id', array_keys($locations))
            ->update(['location' => 'Kệ I1']);

        DB::table('books')
            ->whereIn('genre', ['Tâm lý', 'Kỹ năng', 'Triết học'])
            ->whereNotIn('book_id', array_keys($locations))
            ->update(['location' => 'Kệ J1']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No strict reverse action is needed for this data correction migration
    }
};
