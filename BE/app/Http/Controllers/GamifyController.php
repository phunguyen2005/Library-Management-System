<?php

namespace App\Http\Controllers;

use App\Models\Badge;
use App\Models\GamifyLog;
use App\Models\Member;
use App\Models\MemberReward;
use App\Models\Reward;
use App\Notifications\GamifyNotification;
use App\Services\GamifyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GamifyController extends Controller
{
    protected GamifyService $gamifyService;

    public function __construct(GamifyService $gamifyService)
    {
        $this->gamifyService = $gamifyService;
    }

    /**
     * Get gamification profile stats and history.
     */
    public function profile(Request $request)
    {
        $member = $request->user();
        if ($member->getRoleName() !== 'student') {
            return response()->json(['message' => 'Tính năng này chỉ dành cho sinh viên.'], 403);
        }

        $activeTickets = MemberReward::query()
            ->with('reward')
            ->where('member_id', $member->member_id)
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->get();

        $logs = GamifyLog::query()
            ->where('member_id', $member->member_id)
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        return response()->json([
            'xp' => $member->xp,
            'points' => $member->points,
            'level' => $member->level,
            'daily_streak' => $member->daily_streak,
            'last_check_in_at' => $member->last_check_in_at?->toDateTimeString(),
            'active_tickets' => $activeTickets,
            'history' => $logs,
        ]);
    }

    /**
     * Daily check-in endpoint.
     */
    public function checkIn(Request $request)
    {
        $member = $request->user();
        if ($member->getRoleName() !== 'student') {
            return response()->json(['message' => 'Tính năng này chỉ dành cho sinh viên.'], 403);
        }

        return DB::transaction(function () use ($member) {
            // Lock member to prevent multiple clicks
            $member = Member::query()->lockForUpdate()->find($member->member_id);
            
            $today = now()->startOfDay();
            $lastCheckIn = $member->last_check_in_at ? $member->last_check_in_at->startOfDay() : null;

            if ($lastCheckIn && $lastCheckIn->equalTo($today)) {
                return response()->json(['message' => 'Bạn đã điểm danh ngày hôm nay rồi.'], 400);
            }

            $streak = 1;
            if ($lastCheckIn) {
                $yesterday = now()->subDay()->startOfDay();
                if ($lastCheckIn->equalTo($yesterday)) {
                    $streak = $member->daily_streak + 1;
                }
            }

            $member->daily_streak = $streak;
            $member->last_check_in_at = now();
            $member->save();

            // Calculate point rewards
            $baseXp = 20;
            $basePoints = 10;
            $bonusPoints = 0;
            $desc = "Điểm danh ngày thứ {$streak}";

            // Bonus points for every 5 day streak milestone
            if ($streak > 0 && $streak % 5 === 0) {
                $bonusPoints = 15;
                $desc .= " (Chuỗi thưởng +15 Điểm)";
            }

            $totalPoints = $basePoints + $bonusPoints;

            $this->gamifyService->awardXpAndPoints(
                $member,
                $baseXp,
                $totalPoints,
                'check_in',
                $desc
            );

            // Refetch fresh member
            $member = $member->fresh();

            return response()->json([
                'message' => 'Điểm danh thành công!',
                'xp_gained' => $baseXp,
                'points_gained' => $totalPoints,
                'xp' => $member->xp,
                'points' => $member->points,
                'level' => $member->level,
                'daily_streak' => $member->daily_streak,
                'last_check_in_at' => $member->last_check_in_at?->toDateTimeString(),
            ]);
        });
    }

    /**
     * Get all available badges and earned status.
     */
    public function badges(Request $request)
    {
        $member = $request->user();
        if ($member->getRoleName() !== 'student') {
            return response()->json(['message' => 'Tính năng này chỉ dành cho sinh viên.'], 403);
        }

        $allBadges = Badge::all();
        $earnedBadges = $member->badges()
            ->get()
            ->keyBy('id');

        $formatted = $allBadges->map(function ($badge) use ($earnedBadges) {
            $isEarned = $earnedBadges->has($badge->id);
            return [
                'id' => $badge->id,
                'code' => $badge->code,
                'name' => $badge->name,
                'description' => $badge->description,
                'icon' => $badge->icon,
                'requirements' => $badge->requirements,
                'is_earned' => $isEarned,
                'earned_at' => $isEarned ? $earnedBadges->get($badge->id)->pivot->earned_at : null,
            ];
        });

        return response()->json($formatted);
    }

    /**
     * Get all redeemable rewards.
     */
    public function rewards(Request $request)
    {
        $rewards = Reward::where('is_active', true)->get();
        return response()->json($rewards);
    }

    /**
     * Redeem points for a reward ticket.
     */
    public function redeem(Request $request, int $rewardId)
    {
        $member = $request->user();
        if ($member->getRoleName() !== 'student') {
            return response()->json(['message' => 'Tính năng này chỉ dành cho sinh viên.'], 403);
        }

        $reward = Reward::query()->where('is_active', true)->findOrFail($rewardId);

        return DB::transaction(function () use ($member, $reward) {
            $member = Member::query()->lockForUpdate()->find($member->member_id);

            if ($member->points < $reward->points_cost) {
                return response()->json(['message' => 'Bạn không có đủ điểm để đổi phần thưởng này.'], 400);
            }

            // Deduct points
            $member->points -= $reward->points_cost;
            $member->save();

            // Set expiration: 30 days for limit boosters
            $expiresAt = null;
            if ($reward->benefit_type === 'loan_limit') {
                $expiresAt = now()->addDays(30);
            }

            $ticket = MemberReward::create([
                'member_id' => $member->member_id,
                'reward_id' => $reward->id,
                'status' => 'active',
                'redeemed_at' => now(),
                'expires_at' => $expiresAt,
            ]);

            // Log point deduction
            GamifyLog::create([
                'member_id' => $member->member_id,
                'event_type' => 'redeem_reward',
                'xp_gained' => 0,
                'points_changed' => -$reward->points_cost,
                'description' => "Đã đổi điểm lấy phần thưởng: {$reward->name}",
            ]);

            // Notify redemption
            try {
                $member->notify(new GamifyNotification(
                    'messages.notifications.gamify.reward_redeemed.title',
                    'messages.notifications.gamify.reward_redeemed.message',
                    'reward_redeemed',
                    [
                        'reward_code' => $reward->code,
                        'reward_name' => $reward->name,
                        'message_params' => ['reward_name' => $reward->name],
                    ]
                ));
            } catch (\Exception $e) {
                // Ignore
            }

            // Log AuditLog
            \App\Services\AuditLoggerService::log(
                'reward_redeem',
                "Thành viên {$member->name} đã đổi {$reward->points_cost} điểm lấy: {$reward->name}",
                $member
            );

            return response()->json([
                'message_key' => 'messages.notifications.gamify.reward_redeemed.response',
                'message_params' => ['reward_name' => $reward->name],
                'message' => __('messages.notifications.gamify.reward_redeemed.response', ['reward_name' => $reward->name]),
                'points' => $member->points,
                'ticket' => $ticket->load('reward'),
            ]);
        });
    }

    /**
     * Get leaderboard rankings.
     */
    public function leaderboard(Request $request)
    {
        $topMembers = Member::query()
            ->select('member_id', 'name', 'level', 'xp')
            ->withCount('badges')
            ->orderByDesc('xp')
            ->orderByDesc('member_id')
            ->limit(10)
            ->get();

        $formatted = $topMembers->map(function ($m, $index) {
            return [
                'rank' => $index + 1,
                'member_id' => $m->member_id,
                'name' => $m->name,
                'level' => $m->level,
                'xp' => $m->xp,
                'badges_count' => $m->badges_count,
            ];
        });

        return response()->json($formatted);
    }
}
