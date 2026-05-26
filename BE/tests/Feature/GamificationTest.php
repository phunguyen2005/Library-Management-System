<?php

namespace Tests\Feature;

use App\Models\Badge;
use App\Models\Member;
use App\Models\Reward;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GamificationTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_student_can_check_in_only_once_per_day(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-checkin-access', ['role:student']);

        // First check-in
        $this->withToken($token->plainTextToken)
            ->postJson('/api/gamify/check-in')
            ->assertOk()
            ->assertJsonPath('message', 'Điểm danh thành công!')
            ->assertJsonPath('xp_gained', 20)
            ->assertJsonPath('points_gained', 10)
            ->assertJsonPath('daily_streak', 1);

        $member = $member->fresh();
        $this->assertEquals(20, $member->xp);
        $this->assertEquals(10, $member->points);
        $this->assertEquals(1, $member->daily_streak);

        // Second check-in on the same day should fail
        $this->withToken($token->plainTextToken)
            ->postJson('/api/gamify/check-in')
            ->assertStatus(400)
            ->assertJsonPath('message', 'Bạn đã điểm danh ngày hôm nay rồi.');
    }

    public function test_student_can_redeem_store_rewards(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-redeem-access', ['role:student']);

        // Ensure rewards are seeded
        $reward = Reward::query()->where('code', 'extra_loan_slot')->first();
        $this->assertNotNull($reward);

        // 1. Attempt to redeem with 0 points (should fail)
        $this->withToken($token->plainTextToken)
            ->postJson("/api/gamify/rewards/{$reward->id}/redeem")
            ->assertStatus(400)
            ->assertJsonPath('message', 'Bạn không có đủ điểm để đổi phần thưởng này.');

        // 2. Add points manually and redeem
        $member->update(['points' => 150]);

        $this->withToken($token->plainTextToken)
            ->postJson("/api/gamify/rewards/{$reward->id}/redeem")
            ->assertOk()
            ->assertJsonStructure([
                'message',
                'points',
                'ticket'
            ]);

        $member = $member->fresh();
        $this->assertEquals(50, $member->points); // 150 - 100 cost
        $this->assertDatabaseHas('member_rewards', [
            'member_id' => $member->member_id,
            'reward_id' => $reward->id,
            'status' => 'active'
        ]);
    }

    public function test_student_can_fetch_badges_list(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-badges-access', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/gamify/badges')
            ->assertOk()
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'code',
                    'name',
                    'description',
                    'icon',
                    'is_earned',
                    'earned_at'
                ]
            ]);
    }

    public function test_can_fetch_leaderboard(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-leaderboard-access', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/gamify/leaderboard')
            ->assertOk()
            ->assertJsonStructure([
                '*' => [
                    'rank',
                    'member_id',
                    'name',
                    'level',
                    'xp',
                    'badges_count'
                ]
            ]);
    }
}
