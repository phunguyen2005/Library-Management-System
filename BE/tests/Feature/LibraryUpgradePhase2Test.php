<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Librarian;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LibraryUpgradePhase2Test extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_critical_actions_are_audit_logged(): void
    {
        $librarian = Librarian::query()->firstOrFail();
        $token = $librarian->createToken('admin-token', ['role:admin']);

        // Test book creation audit log
        $this->withToken($token->plainTextToken)
            ->postJson('/api/books', [
                'title' => 'Sach Kiem Toan Thu Nghiem',
                'author' => 'Tac Gia Kiem Toan',
                'genre' => 'Science',
                'quantity' => 10,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'book_create',
            'user_type' => 'admin',
        ]);
    }

    public function test_overdue_return_calculates_fine_correctly(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-05-23 12:00:00'));

        $librarian = Librarian::query()->firstOrFail();
        $token = $librarian->createToken('admin-token', ['role:admin']);

        $member = Member::query()->findOrFail(1);
        $book = Book::query()->findOrFail(1);

        $borrowing = Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => $member->member_id,
            'status' => Borrowing::STATUS_BORROWED,
            'borrow_date' => '2026-05-01',
            'due_date' => '2026-05-15',
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson("/api/requests/{$borrowing->loan_id}/return")
            ->assertOk();

        // 8 days late (15th to 23rd) * 5000 = 40000
        $this->assertDatabaseHas('fines', [
            'loan_id' => $borrowing->loan_id,
            'member_id' => $member->member_id,
            'amount' => 40000.00,
            'status' => 'unpaid',
        ]);
    }

    public function test_admin_can_collect_fine(): void
    {
        $librarian = Librarian::query()->firstOrFail();
        $token = $librarian->createToken('admin-token', ['role:admin']);

        $member = Member::query()->findOrFail(1);
        $book = Book::query()->findOrFail(1);

        $borrowing = Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => $member->member_id,
            'status' => Borrowing::STATUS_RETURNED,
            'borrow_date' => '2026-05-01',
            'due_date' => '2026-05-15',
            'return_date' => '2026-05-23',
        ]);

        $fine = \App\Models\Fine::create([
            'loan_id' => $borrowing->loan_id,
            'member_id' => $member->member_id,
            'amount' => 40000,
            'status' => 'unpaid',
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson("/api/fines/{$fine->fine_id}/pay")
            ->assertOk()
            ->assertJsonPath('message', 'Đã xác nhận đóng phí phạt thành công.')
            ->assertJsonPath('fine.status', 'paid');

        $this->assertDatabaseHas('fines', [
            'fine_id' => $fine->fine_id,
            'status' => 'paid',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'collect_fine',
            'user_type' => 'admin',
        ]);
    }

    public function test_artisan_command_calculates_fines_accrued(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-05-23 00:05:00', 'Asia/Ho_Chi_Minh'));

        $member = Member::query()->findOrFail(1);
        $book = Book::query()->findOrFail(1);

        $borrowing = Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => $member->member_id,
            'status' => Borrowing::STATUS_BORROWED,
            'borrow_date' => '2026-05-01',
            'due_date' => '2026-05-15',
        ]);

        $this->artisan('borrowings:calculate-fines')
            ->expectsOutput("Đã cập nhật tiền phạt cho 2 phiếu mượn trễ hạn với tổng số tiền 230,000 VND.")
            ->assertExitCode(0);

        $this->assertDatabaseHas('fines', [
            'loan_id' => $borrowing->loan_id,
            'status' => 'unpaid',
            'amount' => 40000.00,
        ]);
    }

    public function test_artisan_command_sends_overdue_warnings(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-05-23 00:05:00', 'Asia/Ho_Chi_Minh'));

        \Illuminate\Support\Facades\Notification::fake();

        $member = Member::query()->findOrFail(1);
        $book = Book::query()->findOrFail(1);

        $borrowing = Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => $member->member_id,
            'status' => Borrowing::STATUS_BORROWED,
            'borrow_date' => '2026-05-01',
            'due_date' => '2026-05-15',
        ]);

        $this->artisan('app:send-overdue-warnings')
            ->expectsOutput("Sent 2 overdue warnings.") // There is another pre-seeded overdue borrowing in the database seeder!
            ->assertExitCode(0);

        \Illuminate\Support\Facades\Notification::assertSentTo(
            $member,
            \App\Notifications\OverdueNotification::class
        );

        \Illuminate\Support\Facades\Notification::assertSentTo(
            $member,
            \App\Notifications\OverdueMailNotification::class
        );
    }
}
