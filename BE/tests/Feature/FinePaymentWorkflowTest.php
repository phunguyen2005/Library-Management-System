<?php

namespace Tests\Feature;

use App\Models\Borrowing;
use App\Models\Fine;
use App\Models\Librarian;
use App\Models\LibrarySetting;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class FinePaymentWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_database_schema_supports_fine_payments_waivers_and_fine_settings(): void
    {
        $this->assertTrue(Schema::hasColumns('fines', [
            'reason',
            'waived_by',
            'waived_reason',
        ]));
        $this->assertTrue(Schema::hasTable('fine_payments'));
        $this->assertTrue(Schema::hasColumns('fine_payments', [
            'payment_id',
            'fine_id',
            'amount_paid',
            'method',
            'transaction_ref',
            'status',
            'collected_by',
            'gateway_response',
            'created_at',
        ]));
        $this->assertTrue(Schema::hasColumns('library_settings', [
            'fine_per_day',
            'max_fine_per_loan',
            'grace_period_days',
        ]));
    }

    public function test_daily_command_calculates_overdue_fine_with_grace_period_and_cap(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-05-23 00:05:00', 'Asia/Ho_Chi_Minh'));

        LibrarySetting::singleton()->forceFill([
            'fine_per_day' => 5000,
            'max_fine_per_loan' => 200000,
            'grace_period_days' => 1,
        ])->save();

        $loan = Borrowing::query()->create([
            'book_id' => 12,
            'member_id' => 3,
            'librarian_id' => 1,
            'status' => Borrowing::STATUS_BORROWED,
            'borrow_date' => '2026-03-29',
            'due_date' => '2026-04-12',
            'return_date' => null,
        ]);

        $this->artisan('borrowings:calculate-fines')->assertExitCode(0);

        $fine = Fine::query()->where('loan_id', $loan->loan_id)->firstOrFail();

        $this->assertSame(3, $fine->member_id);
        $this->assertSame('overdue', $fine->reason);
        $this->assertSame('unpaid', $fine->status);
        $this->assertSame(200000.0, (float) $fine->amount);
    }

    public function test_student_can_view_fine_summary_and_detail_payload(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-05-23 09:00:00'));

        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-fines', ['role:student']);

        Fine::query()->create([
            'loan_id' => 1,
            'member_id' => $member->member_id,
            'amount' => 65000,
            'reason' => 'overdue',
            'status' => 'unpaid',
        ]);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/fines/me/summary')
            ->assertOk()
            ->assertJson([
                'has_unpaid' => true,
                'total_unpaid' => 65000,
                'count' => 1,
            ]);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/fines/me')
            ->assertOk()
            ->assertJsonPath('total_unpaid', 65000)
            ->assertJsonPath('fines.0.loan_id', 1)
            ->assertJsonPath('fines.0.book_title', 'Giáo trình Tâm lý học Đại cương')
            ->assertJsonPath('fines.0.days_overdue', 38)
            ->assertJsonPath('fines.0.amount', 65000)
            ->assertJsonPath('fines.0.status', 'unpaid');
    }

    public function test_admin_can_filter_fines_and_read_statistics(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-fines-index', ['role:admin']);

        Fine::query()->create([
            'loan_id' => 1,
            'member_id' => 1,
            'amount' => 40000,
            'reason' => 'overdue',
            'status' => 'unpaid',
        ]);
        Fine::query()->create([
            'loan_id' => 2,
            'member_id' => 2,
            'amount' => 15000,
            'reason' => 'damaged',
            'status' => 'paid',
            'paid_at' => now(),
        ]);
        Fine::query()->create([
            'loan_id' => 3,
            'member_id' => 1,
            'amount' => 10000,
            'reason' => 'lost',
            'status' => 'waived',
        ]);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/admin/fines?status=unpaid&member_id=1')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'unpaid')
            ->assertJsonPath('data.0.member.member_id', 1)
            ->assertJsonCount(1, 'data');

        $this->withToken($token->plainTextToken)
            ->getJson('/api/admin/fines/statistics')
            ->assertOk()
            ->assertJsonPath('total_collected', 15000)
            ->assertJsonPath('total_unpaid', 40000)
            ->assertJsonPath('total_waived', 10000)
            ->assertJsonStructure([
                'total_collected',
                'total_unpaid',
                'total_waived',
                'this_month_collected',
                'by_month' => [
                    '*' => ['month', 'collected', 'unpaid', 'waived'],
                ],
            ]);
    }

    public function test_admin_can_pay_unpaid_fine_and_create_payment_audit_trail(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-fines-pay', ['role:admin']);

        Borrowing::find(1)->update(['status' => 'returned', 'return_date' => '2026-04-10']);

        $fine = Fine::query()->create([
            'loan_id' => 1,
            'member_id' => 1,
            'amount' => 40000,
            'reason' => 'overdue',
            'status' => 'unpaid',
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson("/api/fines/{$fine->fine_id}/pay", [
                'method' => 'cash',
                'note' => 'Thu tai quay sang 23/05',
            ])
            ->assertOk()
            ->assertJsonPath('fine.status', 'paid')
            ->assertJsonPath('fine.payments.0.method', 'cash')
            ->assertJsonPath('fine.payments.0.status', 'completed');

        $this->assertDatabaseHas('fines', [
            'fine_id' => $fine->fine_id,
            'status' => 'paid',
        ]);
        $this->assertDatabaseHas('fine_payments', [
            'fine_id' => $fine->fine_id,
            'amount_paid' => 40000,
            'method' => 'cash',
            'status' => 'completed',
            'collected_by' => $librarian->librarian_id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'collect_fine',
            'user_id' => $librarian->librarian_id,
            'user_type' => 'admin',
        ]);
    }

    public function test_admin_can_waive_unpaid_fine_with_required_reason(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-fines-waive', ['role:admin']);

        $fine = Fine::query()->create([
            'loan_id' => 1,
            'member_id' => 1,
            'amount' => 40000,
            'reason' => 'overdue',
            'status' => 'unpaid',
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson("/api/fines/{$fine->fine_id}/waive", [
                'reason' => 'Sinh vien co xac nhan ly do chinh dang',
            ])
            ->assertOk()
            ->assertJsonPath('fine.status', 'waived')
            ->assertJsonPath('fine.waived_by', $librarian->librarian_id)
            ->assertJsonPath('fine.waived_reason', 'Sinh vien co xac nhan ly do chinh dang');

        $this->assertDatabaseHas('fines', [
            'fine_id' => $fine->fine_id,
            'status' => 'waived',
            'waived_by' => $librarian->librarian_id,
            'waived_reason' => 'Sinh vien co xac nhan ly do chinh dang',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'waive_fine',
            'user_id' => $librarian->librarian_id,
            'user_type' => 'admin',
        ]);
    }

    public function test_admin_cannot_waive_paid_fine(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-fines-waive-paid', ['role:admin']);

        $fine = Fine::query()->create([
            'loan_id' => 1,
            'member_id' => 1,
            'amount' => 40000,
            'reason' => 'overdue',
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson("/api/fines/{$fine->fine_id}/waive", [
                'reason' => 'Khong the mien khoan da thu tien',
            ])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Không thể miễn khoản phạt đã thanh toán.',
            ]);
    }

    public function test_unpaid_fine_blocks_new_borrow_requests(): void
    {
        $member = Member::query()->findOrFail(3);
        $token = $member->createToken('student-fine-block', ['role:student']);

        $loan = Borrowing::query()->create([
            'book_id' => 12,
            'member_id' => $member->member_id,
            'librarian_id' => 1,
            'status' => Borrowing::STATUS_RETURNED,
            'borrow_date' => '2026-05-01',
            'due_date' => '2026-05-15',
            'return_date' => '2026-05-20',
        ]);

        Fine::query()->create([
            'loan_id' => $loan->loan_id,
            'member_id' => $member->member_id,
            'amount' => 25000,
            'reason' => 'overdue',
            'status' => 'unpaid',
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/requests', ['book_id' => 15])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Bạn cần thanh toán các khoản phí phạt còn nợ trước khi mượn sách mới.',
            ]);
    }



    public function test_admin_can_manually_create_fine(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $adminToken = $librarian->createToken('admin-create-fine', ['role:admin']);
        
        $student = Member::query()->findOrFail(1);
        
        // 1. Create manual fine without loan
        $this->withToken($adminToken->plainTextToken)
            ->postJson('/api/admin/fines', [
                'member_id' => $student->member_id,
                'amount' => 150000,
                'reason' => 'damaged',
                'notes' => 'Rách bìa sách giáo trình',
            ])
            ->assertStatus(201)
            ->assertJsonPath('fine.amount', 150000)
            ->assertJsonPath('fine.reason', 'damaged')
            ->assertJsonPath('fine.notes', 'Rách bìa sách giáo trình')
            ->assertJsonPath('fine.loan_id', null);

        $this->assertDatabaseHas('fines', [
            'member_id' => $student->member_id,
            'amount' => 150000,
            'reason' => 'damaged',
            'notes' => 'Rách bìa sách giáo trình',
            'loan_id' => null,
            'status' => 'unpaid',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'create_fine',
            'user_id' => $librarian->librarian_id,
        ]);

        // 2. Create manual fine with loan
        $loan = Borrowing::query()->create([
            'book_id' => 3,
            'member_id' => $student->member_id,
            'status' => Borrowing::STATUS_RETURNED,
            'borrow_date' => '2026-05-01',
        ]);

        $this->withToken($adminToken->plainTextToken)
            ->postJson('/api/admin/fines', [
                'member_id' => $student->member_id,
                'loan_id' => $loan->loan_id,
                'amount' => 75000,
                'reason' => 'lost',
                'notes' => 'Mất đĩa DVD đi kèm sách',
            ])
            ->assertStatus(201)
            ->assertJsonPath('fine.loan_id', $loan->loan_id);

        $this->assertDatabaseHas('fines', [
            'loan_id' => $loan->loan_id,
            'amount' => 75000,
            'notes' => 'Mất đĩa DVD đi kèm sách',
        ]);

        // 3. Prevent mismatched loan_id and member_id
        $otherStudent = Member::query()->findOrFail(2);
        $this->withToken($adminToken->plainTextToken)
            ->postJson('/api/admin/fines', [
                'member_id' => $otherStudent->member_id,
                'loan_id' => $loan->loan_id, // Belongs to student 1, not student 2
                'amount' => 20000,
                'reason' => 'damaged',
            ])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Phiếu mượn không thuộc về thành viên được chọn.',
            ]);
    }

    public function test_student_cannot_manually_create_fine(): void
    {
        $student = Member::query()->findOrFail(1);
        $studentToken = $student->createToken('student-fines', ['role:student']);

        $this->withToken($studentToken->plainTextToken)
            ->postJson('/api/admin/fines', [
                'member_id' => $student->member_id,
                'amount' => 50000,
                'reason' => 'damaged',
            ])
            ->assertStatus(403);
    }

    public function test_student_can_apply_fine_waiver_ticket(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-fines', ['role:student']);

        // Create a fine of 40,000 VND (<= 50,000 VND limit)
        $fine = Fine::query()->create([
            'loan_id' => 1,
            'member_id' => $member->member_id,
            'amount' => 40000,
            'reason' => 'overdue',
            'status' => 'unpaid',
        ]);

        // Mock a returned borrowing so the fine isn't actively overdue/growing
        Borrowing::find(1)->update(['status' => 'returned', 'return_date' => '2026-04-10']);

        // 1. Try to apply without ticket (should fail)
        $this->withToken($token->plainTextToken)
            ->postJson("/api/fines/{$fine->fine_id}/apply-waiver")
            ->assertStatus(400)
            ->assertJsonPath('message', 'Bạn không có vé miễn phạt khả dụng.');

        // 2. Buy a fine waiver ticket
        $reward = \App\Models\Reward::query()->where('benefit_type', 'fine_waiver')->first();
        $this->assertNotNull($reward);

        \App\Models\MemberReward::create([
            'member_id' => $member->member_id,
            'reward_id' => $reward->id,
            'status' => 'active',
            'redeemed_at' => now(),
            'expires_at' => now()->addDays(30),
        ]);

        // 3. Apply waiver (should succeed)
        $this->withToken($token->plainTextToken)
            ->postJson("/api/fines/{$fine->fine_id}/apply-waiver")
            ->assertOk()
            ->assertJsonPath('fine.status', 'waived')
            ->assertJsonPath('fine.waived_reason', 'Sử dụng vé miễn phạt: ' . $reward->name);

        $this->assertDatabaseHas('fines', [
            'fine_id' => $fine->fine_id,
            'status' => 'waived',
        ]);

        $this->assertDatabaseHas('member_rewards', [
            'member_id' => $member->member_id,
            'reward_id' => $reward->id,
            'status' => 'used',
        ]);
    }

    public function test_student_cannot_apply_fine_waiver_ticket_for_large_fine(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-fines', ['role:student']);

        // Create a fine of 60,000 VND (> 50,000 VND limit)
        $fine = Fine::query()->create([
            'loan_id' => 1,
            'member_id' => $member->member_id,
            'amount' => 60000,
            'reason' => 'overdue',
            'status' => 'unpaid',
        ]);

        Borrowing::find(1)->update(['status' => 'returned', 'return_date' => '2026-04-10']);

        $reward = \App\Models\Reward::query()->where('benefit_type', 'fine_waiver')->first();
        \App\Models\MemberReward::create([
            'member_id' => $member->member_id,
            'reward_id' => $reward->id,
            'status' => 'active',
            'redeemed_at' => now(),
            'expires_at' => now()->addDays(30),
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson("/api/fines/{$fine->fine_id}/apply-waiver")
            ->assertStatus(400)
            ->assertJson([
                'message' => 'Vé miễn phạt này chỉ có thể áp dụng cho các khoản phạt từ ' . number_format($reward->benefit_value) . ' VND trở xuống.',
            ]);
    }
}

