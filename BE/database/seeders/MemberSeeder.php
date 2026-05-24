<?php

namespace Database\Seeders;

use App\Models\Member;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MemberSeeder extends Seeder
{
    public function run(): void
    {
        $defaultPassword = env('LIBRARY_DEMO_PASSWORD', 'Library@2026');

        DB::table('members')->upsert([
            [
                'member_id' => 1,
                'name' => 'Nguyen Thi Minh Anh',
                'email' => '4801104101@student.hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0901000001',
                'join_date' => '2026-03-17',
            ],
            [
                'member_id' => 2,
                'name' => 'Tran Van Khoa',
                'email' => '4801104102@student.hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0901000002',
                'join_date' => '2026-03-17',
            ],
            [
                'member_id' => 3,
                'name' => 'Le Thi Ngoc Han',
                'email' => '4901104111@student.hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0901000003',
                'join_date' => '2026-03-17',
            ],
            [
                'member_id' => 4,
                'name' => 'Pham Quoc Huy',
                'email' => '4901104112@student.hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0901000004',
                'join_date' => '2026-03-17',
            ],
            [
                'member_id' => 5,
                'name' => 'Vu Hoang Nam',
                'email' => '4901104113@student.hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0901000005',
                'join_date' => '2026-03-17',
            ],
            [
                'member_id' => 6,
                'name' => 'Hoang Thi Lan',
                'email' => '5001104121@student.hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0901000006',
                'join_date' => '2026-03-17',
            ],
            [
                'member_id' => 7,
                'name' => 'Do Minh Duc',
                'email' => '5001104122@student.hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0901000007',
                'join_date' => '2026-03-17',
            ],
            [
                'member_id' => 8,
                'name' => 'Bui Thi Thanh Tam',
                'email' => '5001104123@student.hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0901000008',
                'join_date' => '2026-03-17',
            ],
            [
                'member_id' => 9,
                'name' => 'Nguyen Gia Bao',
                'email' => '5101104131@student.hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0901000009',
                'join_date' => '2026-03-17',
            ],
            [
                'member_id' => 10,
                'name' => 'Tran Ngoc Hanh',
                'email' => '5101104132@student.hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0901000010',
                'join_date' => '2026-03-17',
            ],
        ], ['member_id'], ['name', 'email', 'password', 'phone_number', 'join_date']);

        // Gán vai trò student cho tất cả sinh viên
        Member::all()->each(function ($member) {
            $member->assignRole('student');
        });
    }
}
