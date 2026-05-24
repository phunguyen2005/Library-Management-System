<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BorrowWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_request_borrow_rejects_duplicate_active_request(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('member-access', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/requests', ['book_id' => 1])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Bạn đã có một yêu cầu hoặc phiếu mượn cho cuốn sách này.',
            ]);
    }

    public function test_request_borrow_rejects_digital_resource_records(): void
    {
        $member = Member::query()->findOrFail(3);
        $token = $member->createToken('member-digital-borrow-access', ['role:student']);
        $digitalBook = Book::query()->where('is_digital', true)->firstOrFail();

        $this->withToken($token->plainTextToken)
            ->postJson('/api/requests', ['book_id' => $digitalBook->book_id])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Tài liệu số không thể được mượn như sách vật lý.',
            ]);
    }

    public function test_request_borrow_rejects_when_active_limit_is_reached(): void
    {
        $member = Member::query()->findOrFail(2);
        $token = $member->createToken('member-limit-access', ['role:student']);

        Book::query()->create([
            'title' => 'Book 6',
            'author' => 'Author 6',
            'genre' => 'Reference',
            'published_year' => 2024,
            'is_available' => true,
            'cover' => null,
            'location' => 'Shelf Z',
            'is_digital' => false,
            'resource_type' => null,
            'file_format' => null,
            'file_size' => null,
            'download_count' => 0,
            'total_quantity' => 1,
            'available_quantity' => 1,
        ]);

        Borrowing::query()->insert([
            [
                'book_id' => 1,
                'member_id' => 2,
                'librarian_id' => null,
                'status' => 'pending',
                'borrow_date' => '2026-04-07',
                'due_date' => null,
                'return_date' => null,
            ],
            [
                'book_id' => 3,
                'member_id' => 2,
                'librarian_id' => null,
                'status' => 'pending',
                'borrow_date' => '2026-04-07',
                'due_date' => null,
                'return_date' => null,
            ],
            [
                'book_id' => 4,
                'member_id' => 2,
                'librarian_id' => null,
                'status' => 'borrowed',
                'borrow_date' => '2026-04-07',
                'due_date' => '2026-04-21',
                'return_date' => null,
            ],
            [
                'book_id' => 5,
                'member_id' => 2,
                'librarian_id' => null,
                'status' => 'borrowed',
                'borrow_date' => '2026-04-07',
                'due_date' => '2026-04-21',
                'return_date' => null,
            ],
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/requests', ['book_id' => 6])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Bạn đã đạt giới hạn 5 yêu cầu đang hoạt động.',
            ]);
    }

    public function test_approve_and_return_update_inventory_transactionally(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('librarian-access', ['role:admin']);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/requests/2/approve')
            ->assertOk()
            ->assertJsonPath('loan.status', 'approved')
            ->assertJsonPath('loan.librarian_id', 1);

        $this->assertDatabaseHas('books', [
            'book_id' => 2,
            'available_quantity' => 0,
            'is_available' => 0,
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/requests/2/confirm-pickup')
            ->assertOk()
            ->assertJsonPath('loan.status', 'borrowed')
            ->assertJsonPath('loan.due_date', today()->addDays(14)->toDateString());

        $this->withToken($token->plainTextToken)
            ->postJson('/api/requests/2/return')
            ->assertOk()
            ->assertJsonPath('loan.status', 'returned')
            ->assertJsonPath('loan.return_date', today()->toDateString());
        $this->assertDatabaseHas('books', [
            'book_id' => 2,
            'available_quantity' => 1,
            'is_available' => 1,
        ]);
    }

    public function test_admin_can_reject_pending_request_with_reason_without_changing_inventory(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('librarian-reject-access', ['role:admin']);

        $this->assertDatabaseHas('books', [
            'book_id' => 2,
            'available_quantity' => 1,
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/requests/2/reject', ['reason' => 'Duplicate request for the same title.'])
            ->assertOk()
            ->assertJsonPath('loan.status', 'rejected')
            ->assertJsonPath('loan.librarian_id', 1)
            ->assertJsonPath('loan.rejection_reason', 'Duplicate request for the same title.');

        $this->assertDatabaseHas('borrowing', [
            'loan_id' => 2,
            'status' => 'rejected',
            'librarian_id' => 1,
            'rejection_reason' => 'Duplicate request for the same title.',
        ]);

        $this->assertDatabaseHas('books', [
            'book_id' => 2,
            'available_quantity' => 1,
        ]);
    }

    public function test_borrowing_resource_exposes_overdue_fields(): void
    {
        $member = Member::query()->findOrFail(3);
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('librarian-overdue-access', ['role:admin']);

        $loan = Borrowing::query()->create([
            'book_id' => 4,
            'member_id' => $member->member_id,
            'librarian_id' => $librarian->librarian_id,
            'status' => 'borrowed',
            'borrow_date' => today()->subDays(20)->toDateString(),
            'due_date' => today()->subDays(3)->toDateString(),
            'return_date' => null,
        ]);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/requests?status=borrowed&limit=1000')
            ->assertOk()
            ->assertJsonPath('data.0.loan_id', $loan->loan_id)
            ->assertJsonPath('data.0.is_overdue', true)
            ->assertJsonPath('data.0.days_overdue', 3)
            ->assertJsonPath('data.0.due_status', 'overdue');
    }

    public function test_reject_requires_reason_and_pending_status(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('librarian-reject-validation-access', ['role:admin']);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/requests/2/reject', ['reason' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/requests/1/reject', ['reason' => 'Already borrowed.'])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Chỉ có thể từ chối yêu cầu đang chờ duyệt.',
            ]);
    }
}
