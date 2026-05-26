<?php

namespace App\Services;

use App\Models\Badge;
use App\Models\GamifyLog;
use App\Models\Member;
use App\Notifications\GamifyNotification;
use Illuminate\Support\Facades\DB;

class GamifyService
{
    /**
     * Award XP and Points to a member.
     */
    public function awardXpAndPoints(Member $member, int $xp, int $points, string $eventType, string $description): void
    {
        DB::transaction(function () use ($member, $xp, $points, $eventType, $description) {
            // Lock member row for update to prevent race conditions
            $member = Member::query()->lockForUpdate()->find($member->member_id);
            if (!$member) return;

            $oldLevel = $member->level;
            
            $member->xp = max(0, $member->xp + $xp);
            $member->points = max(0, $member->points + $points);

            // Level formula: level = floor(XP / 200) + 1
            $newLevel = (int) floor($member->xp / 200) + 1;
            
            if ($newLevel > $oldLevel) {
                $member->level = $newLevel;
                
                // Notify level up
                try {
                    $member->notify(new GamifyNotification(
                        'Chúc mừng thăng hạng!',
                        "Bạn đã thăng hạng lên Cấp độ {$newLevel}!",
                        'level_up',
                        ['new_level' => $newLevel]
                    ));
                } catch (\Exception $e) {
                    // Ignore notification exceptions in tests/local
                }

                \App\Services\AuditLoggerService::log(
                    'level_up',
                    "Thành viên {$member->name} đã thăng cấp từ {$oldLevel} → {$newLevel} (Mã SV: {$member->member_id})",
                    $member
                );
            }

            $member->save();

            // Create gamification history log
            GamifyLog::create([
                'member_id' => $member->member_id,
                'event_type' => $eventType,
                'xp_gained' => $xp,
                'points_changed' => $points,
                'description' => $description,
            ]);

            // Run badge checkers
            $this->checkBadgeTriggers($member);
        });
    }

    /**
     * Check badge qualification rules and award badges.
     */
    public function checkBadgeTriggers(Member $member): void
    {
        $earnedBadgeIds = $member->badges()->pluck('badges.id')->toArray();
        $allBadges = Badge::all();

        foreach ($allBadges as $badge) {
            // Skip if already earned
            if (in_array($badge->id, $earnedBadgeIds)) {
                continue;
            }

            $shouldAward = false;

            switch ($badge->code) {
                case 'first_borrow':
                    $shouldAward = $member->borrowings()
                        ->whereIn('status', ['borrowed', 'returned'])
                        ->exists();
                    break;

                case 'speed_reader':
                    $shouldAward = $member->readingProgress()
                        ->where('percentage', '>=', 100)
                        ->exists();
                    break;

                case 'review_critique':
                    $shouldAward = $member->reviews()
                        ->where('rating', '>=', 4)
                        ->count() >= 3;
                    break;

                case 'room_scholar':
                    $shouldAward = \App\Models\RoomBooking::query()
                        ->where('member_id', $member->member_id)
                        ->whereIn('status', ['checked_in', 'checked_out'])
                        ->count() >= 5;
                    break;

                case 'streak_master':
                    $shouldAward = $member->daily_streak >= 7;
                    break;

                case 'level_five':
                    $shouldAward = $member->level >= 5;
                    break;
            }

            if ($shouldAward) {
                $member->badges()->attach($badge->id, ['earned_at' => now()]);

                // Create audit log for badge
                \App\Services\AuditLoggerService::log(
                    'badge_earned',
                    "Thành viên {$member->name} đã đạt huy hiệu: {$badge->name} (Mã huy hiệu: {$badge->code})",
                    $member
                );

                // Notify badge earned
                try {
                    $member->notify(new GamifyNotification(
                        'Đã mở khóa huy hiệu mới!',
                        "Chúc mừng! Bạn đã nhận được huy hiệu \"{$badge->name}\"!",
                        'badge_earned',
                        ['badge_code' => $badge->code, 'badge_name' => $badge->name]
                    ));
                } catch (\Exception $e) {
                    // Ignore
                }

                // Log entry (0 XP, 0 Points change, but historical mention)
                GamifyLog::create([
                    'member_id' => $member->member_id,
                    'event_type' => 'badge_earned',
                    'xp_gained' => 0,
                    'points_changed' => 0,
                    'description' => "Đạt huy hiệu: {$badge->name}",
                ]);
            }
        }
    }
}
