<?php

namespace Database\Seeders;

use App\Models\Badge;
use App\Models\Reward;
use Illuminate\Database\Seeder;

class GamifySeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed badges
        $badges = [
            [
                'code' => 'first_borrow',
                'name' => 'Mộc bản',
                'description' => 'Mượn cuốn sách vật lý đầu tiên thành công.',
                'icon' => 'menu_book',
                'requirements' => 'Mượn thành công 1 cuốn sách vật lý.',
            ],
            [
                'code' => 'speed_reader',
                'name' => 'Kỷ lục gia',
                'description' => 'Đọc xong 1 cuốn sách điện tử (tài liệu số) đạt 100% tiến độ.',
                'icon' => 'speed',
                'requirements' => 'Đạt 100% tiến độ đọc sách số.',
            ],
            [
                'code' => 'review_critique',
                'name' => 'Nhà bình luận',
                'description' => 'Viết ít nhất 3 bài đánh giá sách đạt từ 4 sao trở lên.',
                'icon' => 'rate_review',
                'requirements' => 'Viết 3 đánh giá >= 4 sao.',
            ],
            [
                'code' => 'room_scholar',
                'name' => 'Học giả năng động',
                'description' => 'Sử dụng và check-in thành công 5 lần tại phòng tự học.',
                'icon' => 'school',
                'requirements' => 'Check-in thành công 5 lần tại phòng học nhóm.',
            ],
            [
                'code' => 'streak_master',
                'name' => 'Chuyên cần vàng',
                'description' => 'Đạt chuỗi điểm danh hàng ngày liên tục 7 ngày.',
                'icon' => 'calendar_month',
                'requirements' => 'Đạt 7 ngày điểm danh liên tiếp.',
            ],
            [
                'code' => 'level_five',
                'name' => 'Đại học sĩ',
                'description' => 'Tài khoản học thuật đạt Cấp độ 5 trở lên.',
                'icon' => 'military_tech',
                'requirements' => 'Đạt cấp độ 5 trong hệ thống.',
            ],
        ];

        foreach ($badges as $badge) {
            Badge::query()->updateOrCreate(['code' => $badge['code']], $badge);
        }

        // 2. Seed rewards
        $rewards = [
            [
                'code' => 'extra_loan_slot',
                'name' => 'Vé Hạn mức (+1 Slot)',
                'description' => 'Tăng số lượng sách vật lý được phép mượn đồng thời thêm 1 cuốn (Hiệu lực trong 30 ngày kể từ khi đổi).',
                'points_cost' => 100,
                'benefit_type' => 'loan_limit',
                'benefit_value' => 1,
                'is_active' => true,
            ],
            [
                'code' => 'extend_loan_days',
                'name' => 'Vé Thời gian (+7 Ngày)',
                'description' => 'Tự động cộng thêm 7 ngày mượn cho lần phê duyệt mượn sách tiếp theo của bạn.',
                'points_cost' => 80,
                'benefit_type' => 'loan_duration',
                'benefit_value' => 7,
                'is_active' => true,
            ],
            [
                'code' => 'waive_overdue_fine',
                'name' => 'Vé miễn phạt quá hạn (Tối đa 50k)',
                'description' => 'Miễn trừ hoàn toàn một hóa đơn phạt quá hạn bất kỳ của bạn có giá trị từ 50,000 VND trở xuống.',
                'points_cost' => 150,
                'benefit_type' => 'fine_waiver',
                'benefit_value' => 50000,
                'is_active' => true,
            ],
        ];

        foreach ($rewards as $reward) {
            Reward::query()->updateOrCreate(['code' => $reward['code']], $reward);
        }
    }
}
