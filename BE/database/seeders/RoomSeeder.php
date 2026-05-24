<?php

namespace Database\Seeders;

use App\Models\Room;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $rooms = [
            [
                'name' => 'Phòng Họp Hội Thảo',
                'capacity' => 20,
                'location' => 'Tầng 1, Khu vực bên trái',
                'amenities' => ['projector', 'tv', 'whiteboard', 'power_outlets', 'microphone'],
                'status' => Room::STATUS_ACTIVE,
                'is_active' => true,
                'description' => 'Không gian tổ chức hội nghị, hội thảo (seminars), chuyên đề hoặc thảo luận nhóm lớn.',
            ],
            [
                'name' => 'Phòng Máy Tính',
                'capacity' => 4,
                'location' => 'Tầng 1, Khu vực bên trái',
                'amenities' => ['power_outlets'],
                'status' => Room::STATUS_ACTIVE,
                'is_active' => true,
                'description' => 'Bố trí 4 máy tính tra cứu tốc độ cao dành cho sinh viên truy cập học liệu số.',
            ],
            [
                'name' => 'Phòng Nhóm R-01',
                'capacity' => 8,
                'location' => 'Tầng 1, Khu Tự học',
                'amenities' => ['whiteboard', 'power_outlets'],
                'status' => Room::STATUS_ACTIVE,
                'is_active' => true,
                'description' => 'Phòng thảo luận nhóm cách âm chất lượng cao, sức chứa 6-8 người.',
            ],
            [
                'name' => 'Phòng Nhóm R-02',
                'capacity' => 8,
                'location' => 'Tầng 1, Khu Tự học',
                'amenities' => ['whiteboard', 'power_outlets'],
                'status' => Room::STATUS_ACTIVE,
                'is_active' => true,
                'description' => 'Phòng thảo luận nhóm cách âm chất lượng cao, sức chứa 6-8 người.',
            ],
            [
                'name' => 'Bàn Nhóm G-01',
                'capacity' => 6,
                'location' => 'Tầng 1, Khu Tự học',
                'amenities' => ['power_outlets'],
                'status' => Room::STATUS_ACTIVE,
                'is_active' => true,
                'description' => 'Bàn họp nhóm lớn tại khu tự học, được trang bị ổ cắm điện và cổng kết nối mạng.',
            ],
            [
                'name' => 'Bàn Nhóm G-02',
                'capacity' => 6,
                'location' => 'Tầng 1, Khu Tự học',
                'amenities' => ['power_outlets'],
                'status' => Room::STATUS_ACTIVE,
                'is_active' => true,
                'description' => 'Bàn họp nhóm lớn tại khu tự học, được trang bị ổ cắm điện và cổng kết nối mạng.',
            ],
            [
                'name' => 'Bàn Nhóm G-03',
                'capacity' => 6,
                'location' => 'Tầng 1, Khu Tự học',
                'amenities' => ['power_outlets'],
                'status' => Room::STATUS_ACTIVE,
                'is_active' => true,
                'description' => 'Bàn họp nhóm lớn tại khu tự học, được trang bị ổ cắm điện và cổng kết nối mạng.',
            ],
        ];

        foreach ($rooms as $room) {
            Room::create($room);
        }
    }
}
