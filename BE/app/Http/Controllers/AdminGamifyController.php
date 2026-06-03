<?php

namespace App\Http\Controllers;

use App\Models\Badge;
use App\Models\GamifyLog;
use App\Models\Member;
use App\Models\MemberReward;
use App\Models\Reward;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminGamifyController extends Controller
{
    /**
     * Get all rewards in the system (catalog).
     */
    public function indexRewards()
    {
        $rewards = Reward::orderBy('points_cost')->get();
        return response()->json($rewards);
    }

    /**
     * Create a new reward in the catalog.
     */
    public function storeReward(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:rewards,code',
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'points_cost' => 'required|integer|min:0',
            'benefit_type' => 'required|string|in:loan_limit,loan_duration,fine_waiver',
            'benefit_value' => 'required|integer|min:1',
            'is_active' => 'required|boolean',
        ]);

        $reward = Reward::create($validated);

        return response()->json([
            'message' => 'Tạo phần thưởng mới thành công.',
            'reward' => $reward
        ], 201);
    }

    /**
     * Update an existing reward in the catalog.
     */
    public function updateReward(Request $request, Reward $reward)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:rewards,code,' . $reward->id,
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'points_cost' => 'required|integer|min:0',
            'benefit_type' => 'required|string|in:loan_limit,loan_duration,fine_waiver',
            'benefit_value' => 'required|integer|min:1',
            'is_active' => 'required|boolean',
        ]);

        $reward->update($validated);

        return response()->json([
            'message' => 'Cập nhật phần thưởng thành công.',
            'reward' => $reward
        ]);
    }

    /**
     * Delete a reward from the catalog.
     */
    public function destroyReward(Reward $reward)
    {
        $reward->delete();

        return response()->json([
            'message' => 'Xóa phần thưởng khỏi kho thành công.'
        ]);
    }

    /**
     * Get a member's gamification status, badges, and tickets.
     */
    public function getMemberGamify(Member $member)
    {
        $allBadges = Badge::all();
        $earnedBadges = $member->badges()->get()->keyBy('id');

        $formattedBadges = $allBadges->map(function ($badge) use ($earnedBadges) {
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

        $tickets = MemberReward::query()
            ->with('reward')
            ->where('member_id', $member->member_id)
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'xp' => $member->xp,
            'points' => $member->points,
            'level' => $member->level,
            'daily_streak' => $member->daily_streak,
            'last_check_in_at' => $member->last_check_in_at?->toDateTimeString(),
            'badges' => $formattedBadges,
            'tickets' => $tickets,
        ]);
    }

    /**
     * Sync a member's badges (award or revoke).
     */
    public function syncMemberBadges(Request $request, Member $member)
    {
        $request->validate([
            'badge_ids' => 'present|array',
            'badge_ids.*' => 'exists:badges,id',
        ]);

        $badgeIds = $request->input('badge_ids');
        
        $currentBadges = $member->badges()->pluck('member_badges.earned_at', 'badges.id')->toArray();
        $syncData = [];
        foreach ($badgeIds as $id) {
            $syncData[$id] = [
                'earned_at' => $currentBadges[$id] ?? now()
            ];
        }
        
        $member->badges()->sync($syncData);

        return response()->json([
            'message' => 'Cập nhật danh sách huy hiệu của thành viên thành công.',
            'badges_count' => $member->badges()->count()
        ]);
    }

    /**
     * Manually grant a reward ticket to a member.
     */
    public function storeMemberReward(Request $request, Member $member)
    {
        $request->validate([
            'reward_id' => 'required|exists:rewards,id',
            'status' => 'nullable|string|in:active,used,expired',
            'expires_at' => 'nullable|date',
        ]);

        $reward = Reward::findOrFail($request->input('reward_id'));
        
        $expiresAt = $request->input('expires_at');
        if (!$expiresAt && $reward->benefit_type === 'loan_limit') {
            $expiresAt = now()->addDays(30)->toDateTimeString();
        }

        $ticket = MemberReward::create([
            'member_id' => $member->member_id,
            'reward_id' => $reward->id,
            'status' => $request->input('status', 'active'),
            'redeemed_at' => now(),
            'expires_at' => $expiresAt,
        ]);

        GamifyLog::create([
            'member_id' => $member->member_id,
            'event_type' => 'redeem_reward',
            'xp_gained' => 0,
            'points_changed' => 0,
            'description' => "Được cấp thủ công phần thưởng: {$reward->name}",
        ]);

        return response()->json([
            'message' => 'Cấp phần thưởng cho thành viên thành công.',
            'ticket' => $ticket->load('reward')
        ]);
    }

    /**
     * Update a member's reward ticket status and/or expiry.
     */
    public function updateMemberReward(Request $request, $id)
    {
        $ticket = MemberReward::findOrFail($id);

        $request->validate([
            'status' => 'required|string|in:active,used,expired',
            'expires_at' => 'nullable|date',
        ]);

        $ticket->status = $request->input('status');
        $ticket->expires_at = $request->input('expires_at');
        
        if ($request->input('status') === 'used') {
            $ticket->used_at = now();
        } else {
            $ticket->used_at = null;
        }
        
        $ticket->save();

        return response()->json([
            'message' => 'Cập nhật trạng thái vé thưởng thành công.',
            'ticket' => $ticket->load('reward')
        ]);
    }

    /**
     * Delete/revoke a member's reward ticket.
     */
    public function destroyMemberReward($id)
    {
        $ticket = MemberReward::findOrFail($id);
        $ticket->delete();

        return response()->json([
            'message' => 'Đã thu hồi/xóa vé thưởng thành công.'
        ]);
    }
}
