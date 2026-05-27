<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Librarian;
use App\Models\Member;
use App\Models\LibrarySetting;
use App\Models\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BorrowingSuspensionTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_approved_borrowing_sets_approved_at_timestamp(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('librarian-access', ['role:admin']);

        // Check a pending loan (loan ID 2 is pending in default seeds)
        $loan = Borrowing::findOrFail(2);
        $this->assertNull($loan->approved_at);

        $this->withToken($token->plainTextToken)
            ->postJson("/api/requests/{$loan->loan_id}/approve")
            ->assertOk();

        $loan->refresh();
        $this->assertNotNull($loan->approved_at);
        $this->assertEquals(Borrowing::STATUS_APPROVED, $loan->status);
    }

    public function test_artisan_cleanup_command_expires_unpicked_approved_requests_after_24_hours(): void
    {
        $settings = LibrarySetting::singleton();
        $settings->update(['pickup_deadline_hours' => 24]);

        $loan = Borrowing::findOrFail(2);
        $loan->update([
            'status' => Borrowing::STATUS_APPROVED,
            'approved_at' => now()->subHours(25),
        ]);

        $this->artisan('borrowings:cleanup-approved')
            ->assertSuccessful();

        $loan->refresh();
        $this->assertEquals(Borrowing::STATUS_CANCELLED, $loan->status);
        $this->assertStringContainsString('Hết thời hạn 24h nhận sách', $loan->rejection_reason);
    }

    public function test_cleanup_command_processes_next_in_queue_properly(): void
    {
        $settings = LibrarySetting::singleton();
        $settings->update(['pickup_deadline_hours' => 24]);

        // Create a book with 0 available
        $book = Book::query()->findOrFail(1);
        $book->update([
            'total_quantity' => 1,
            'available_quantity' => 0,
            'is_available' => false,
        ]);

        // Create a waiting reservation
        $member2 = Member::query()->findOrFail(2);
        Reservation::create([
            'book_id' => $book->book_id,
            'member_id' => $member2->member_id,
            'position' => 1,
            'status' => Reservation::STATUS_WAITING,
        ]);

        // Create an approved loan that has expired
        $loan = Borrowing::create([
            'book_id' => $book->book_id,
            'member_id' => 1,
            'status' => Borrowing::STATUS_APPROVED,
            'borrow_date' => now()->subHours(25)->toDateString(),
            'approved_at' => now()->subHours(25),
        ]);

        $this->artisan('borrowings:cleanup-approved')
            ->assertSuccessful();

        // Expired loan should be cancelled
        $loan->refresh();
        $this->assertEquals(Borrowing::STATUS_CANCELLED, $loan->status);

        // Member 2's reservation should be completed and an approved loan created for them
        $this->assertDatabaseHas('reservations', [
            'book_id' => $book->book_id,
            'member_id' => $member2->member_id,
            'status' => Reservation::STATUS_COMPLETED,
        ]);

        $this->assertDatabaseHas('borrowing', [
            'book_id' => $book->book_id,
            'member_id' => $member2->member_id,
            'status' => Borrowing::STATUS_APPROVED,
        ]);

        // Available quantity should still be 0 (because the book went from expired student 1 to approved student 2)
        $book->refresh();
        $this->assertEquals(0, $book->available_quantity);
    }

    public function test_exceeding_max_missed_pickups_suspends_student_account(): void
    {
        $settings = LibrarySetting::singleton();
        $settings->update([
            'pickup_deadline_hours' => 24,
            'max_missed_pickups' => 3,
            'suspension_duration_days' => 14,
        ]);

        $member = Member::query()->findOrFail(1);
        $this->assertNull($member->borrow_suspended_until);

        // Add 3 historic violations in the last 14 days
        for ($i = 0; $i < 3; $i++) {
            Borrowing::create([
                'book_id' => 1,
                'member_id' => $member->member_id,
                'status' => Borrowing::STATUS_CANCELLED,
                'rejection_reason' => 'Hết thời hạn 24h nhận sách — tự động hủy bởi hệ thống',
                'rejected_at' => now()->subDays(1),
                'borrow_date' => now()->subDays(2)->toDateString(),
            ]);
        }

        // Add the 4th violation that triggers the suspension (so infraction count exceeds max_missed_pickups = 3)
        $activeLoan = Borrowing::findOrFail(2);
        $activeLoan->update([
            'member_id' => $member->member_id,
            'status' => Borrowing::STATUS_APPROVED,
            'approved_at' => now()->subHours(25),
        ]);

        $this->artisan('borrowings:cleanup-approved')
            ->assertSuccessful();

        $member->refresh();
        $this->assertNotNull($member->borrow_suspended_until);
        $this->assertTrue(now()->lt($member->borrow_suspended_until));
    }

    public function test_suspended_student_is_blocked_from_borrowing_and_reserving(): void
    {
        $member = Member::query()->findOrFail(1);
        $member->update([
            'borrow_suspended_until' => now()->addDays(14),
        ]);

        $token = $member->createToken('suspended-token', ['role:student']);

        // Test borrowing request blocked
        $this->withToken($token->plainTextToken)
            ->postJson('/api/requests', ['book_id' => 1])
            ->dump()
            ->assertStatus(422)
            ->assertJsonStructure(['message']);

        // Test reserving request blocked
        $this->withToken($token->plainTextToken)
            ->postJson('/api/reservations/1')
            ->assertStatus(422)
            ->assertJsonStructure(['message']);
    }

    public function test_librarian_can_manually_unsuspend_suspended_member(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $librarianToken = $librarian->createToken('librarian-token', ['role:admin']);

        $member = Member::query()->findOrFail(2);
        $member->update([
            'borrow_suspended_until' => now()->addDays(14),
        ]);

        $this->withToken($librarianToken->plainTextToken)
            ->putJson("/api/members/{$member->member_id}", [
                'name' => $member->name,
                'email' => $member->email,
                'borrow_suspended_until' => null,
            ])
            ->assertOk()
            ->assertJsonPath('borrow_suspended_until', null);

        $member->refresh();
        $this->assertNull($member->borrow_suspended_until);
    }
}
