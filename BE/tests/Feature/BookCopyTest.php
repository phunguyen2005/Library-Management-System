<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class BookCopyTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    protected function setUp(): void
    {
        parent::setUp();

        Queue::fake();
        Notification::fake();
    }

    public function test_creating_physical_book_creates_matching_barcoded_copies(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('copy-create-access', ['role:admin']);

        $response = $this->withToken($token->plainTextToken)
            ->postJson('/api/books', [
                'title' => 'Copy Tracking Handbook',
                'author' => 'Library Ops',
                'genre' => 'Technology',
                'location' => 'C1',
                'quantity' => 3,
                'is_digital' => false,
            ])
            ->assertCreated();

        $bookId = $response->json('book_id');

        $this->assertSame(3, DB::table('book_copies')->where('book_id', $bookId)->count());
        $this->assertDatabaseHas('book_copies', [
            'book_id' => $bookId,
            'barcode' => "BC-SACH-{$bookId}-01",
            'status' => 'available',
            'condition' => 'good',
        ]);
        $this->assertDatabaseHas('book_copies', [
            'book_id' => $bookId,
            'barcode' => "BC-SACH-{$bookId}-03",
            'status' => 'available',
            'condition' => 'good',
        ]);
    }

    public function test_approve_holds_inventory_without_assigning_a_physical_copy(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('copy-approve-access', ['role:admin']);
        $loan = $this->createPendingPhysicalLoan();
        $book = $loan->book;

        $this->withToken($token->plainTextToken)
            ->postJson("/api/requests/{$loan->loan_id}/approve")
            ->assertOk()
            ->assertJsonPath('loan.status', Borrowing::STATUS_APPROVED)
            ->assertJsonPath('loan.copy_id', null)
            ->assertJsonPath('loan.barcode', null);

        $this->assertDatabaseHas('borrowing', [
            'loan_id' => $loan->loan_id,
            'copy_id' => null,
            'status' => Borrowing::STATUS_APPROVED,
        ]);
        $this->assertDatabaseHas('books', [
            'book_id' => $book->book_id,
            'available_quantity' => max(0, $book->available_quantity - 1),
        ]);
    }

    public function test_confirm_pickup_requires_available_barcode_and_marks_copy_borrowed(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('copy-pickup-access', ['role:admin']);
        $loan = $this->createPendingPhysicalLoan();

        $this->withToken($token->plainTextToken)
            ->postJson("/api/requests/{$loan->loan_id}/approve")
            ->assertOk();

        $this->withToken($token->plainTextToken)
            ->postJson("/api/requests/{$loan->loan_id}/confirm-pickup")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['barcode']);

        $barcode = DB::table('book_copies')
            ->where('book_id', $loan->book_id)
            ->where('status', 'available')
            ->value('barcode');

        $this->withToken($token->plainTextToken)
            ->postJson("/api/requests/{$loan->loan_id}/confirm-pickup", [
                'barcode' => $barcode,
            ])
            ->assertOk()
            ->assertJsonPath('loan.status', Borrowing::STATUS_BORROWED)
            ->assertJsonPath('loan.barcode', $barcode);

        $copy = DB::table('book_copies')->where('barcode', $barcode)->first();

        $this->assertDatabaseHas('borrowing', [
            'loan_id' => $loan->loan_id,
            'copy_id' => $copy->id,
            'status' => Borrowing::STATUS_BORROWED,
        ]);
        $this->assertDatabaseHas('book_copies', [
            'id' => $copy->id,
            'status' => 'borrowed',
            'condition' => 'good',
        ]);
    }

    public function test_return_book_updates_the_linked_copy_condition_and_inventory(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('copy-return-access', ['role:admin']);
        $loan = $this->createPendingPhysicalLoan();

        $this->withToken($token->plainTextToken)
            ->postJson("/api/requests/{$loan->loan_id}/approve")
            ->assertOk();

        $barcode = DB::table('book_copies')
            ->where('book_id', $loan->book_id)
            ->where('status', 'available')
            ->value('barcode');

        $this->withToken($token->plainTextToken)
            ->postJson("/api/requests/{$loan->loan_id}/confirm-pickup", ['barcode' => $barcode])
            ->assertOk();

        $this->withToken($token->plainTextToken)
            ->postJson("/api/requests/{$loan->loan_id}/return", [
                'barcode' => $barcode,
                'condition' => 'damaged',
                'condition_note' => 'Spine cracked',
            ])
            ->assertOk()
            ->assertJsonPath('loan.status', Borrowing::STATUS_RETURNED)
            ->assertJsonPath('loan.barcode', $barcode);

        $this->assertDatabaseHas('book_copies', [
            'barcode' => $barcode,
            'status' => 'repairing',
            'condition' => 'damaged',
        ]);
        $this->assertDatabaseHas('books', [
            'book_id' => $loan->book_id,
            'repairing_quantity' => 1,
        ]);
    }

    public function test_borrowed_copy_cannot_be_deleted(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('copy-delete-access', ['role:admin']);
        $loan = $this->createPendingPhysicalLoan();

        $this->withToken($token->plainTextToken)
            ->postJson("/api/requests/{$loan->loan_id}/approve")
            ->assertOk();

        $barcode = DB::table('book_copies')
            ->where('book_id', $loan->book_id)
            ->where('status', 'available')
            ->value('barcode');

        $this->withToken($token->plainTextToken)
            ->postJson("/api/requests/{$loan->loan_id}/confirm-pickup", ['barcode' => $barcode])
            ->assertOk();

        $copy = DB::table('book_copies')->where('barcode', $barcode)->first();

        $this->withToken($token->plainTextToken)
            ->deleteJson("/api/books/{$loan->book_id}/copies/{$copy->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('book_copies', [
            'id' => $copy->id,
            'status' => 'borrowed',
        ]);
    }

    private function createPendingPhysicalLoan(int $quantity = 2): Borrowing
    {
        $book = Book::query()->create([
            'title' => 'Isolated Copy Fixture '.uniqid(),
            'author' => 'Library Ops',
            'genre' => 'Technology',
            'published_year' => 2026,
            'is_available' => true,
            'cover' => null,
            'location' => 'C1',
            'is_digital' => false,
            'resource_type' => null,
            'file_format' => null,
            'file_size' => null,
            'download_count' => 0,
            'total_quantity' => $quantity,
            'available_quantity' => $quantity,
            'repairing_quantity' => 0,
        ]);

        $member = Member::query()->findOrFail(3);

        return Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => $member->member_id,
            'status' => Borrowing::STATUS_PENDING,
            'borrow_date' => today()->toDateString(),
        ]);
    }
}
