<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Librarian;
use App\Models\Member;
use App\Models\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookReservationTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function createUnavailableBook(string $title = 'Test Book'): Book
    {
        return Book::query()->create([
            'title' => $title,
            'author' => 'Test Author',
            'genre' => 'Fiction',
            'published_year' => 2026,
            'is_available' => false,
            'cover' => null,
            'location' => 'Shelf A',
            'is_digital' => false,
            'total_quantity' => 1,
            'available_quantity' => 0,
        ]);
    }

    private function createStudent(string $name, string $email): Member
    {
        return Member::query()->create([
            'name' => $name,
            'email' => $email,
            'phone_number' => '0901234567',
            'join_date' => now()->toDateString(),
        ]);
    }

    public function test_cannot_reserve_available_book(): void
    {
        $member = $this->createStudent('Student X', 'student.x@hcmue.edu.vn');
        
        $book = Book::query()->create([
            'title' => 'Available Book',
            'author' => 'Author',
            'is_available' => true,
            'is_digital' => false,
            'total_quantity' => 1,
            'available_quantity' => 1,
        ]);

        $this->actingAs($member, 'sanctum')
            ->postJson("/api/reservations/{$book->book_id}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Sách hiện vẫn còn bản sẵn sàng để mượn.');
    }

    public function test_can_reserve_unavailable_book_and_position_is_calculated(): void
    {
        $member1 = $this->createStudent('Student A', 'student.a@hcmue.edu.vn');
        $member2 = $this->createStudent('Student B', 'student.b@hcmue.edu.vn');

        $book = $this->createUnavailableBook('Unavailable Book A');

        // Member 1 reserves
        $this->actingAs($member1, 'sanctum')
            ->postJson("/api/reservations/{$book->book_id}")
            ->assertCreated()
            ->assertJsonPath('reservation.position', 1);

        // Member 2 reserves
        $this->actingAs($member2, 'sanctum')
            ->postJson("/api/reservations/{$book->book_id}")
            ->assertCreated()
            ->assertJsonPath('reservation.position', 2);

        $this->assertDatabaseHas('reservations', [
            'member_id' => $member1->member_id,
            'book_id' => $book->book_id,
            'position' => 1,
            'status' => Reservation::STATUS_WAITING,
        ]);
        $this->assertDatabaseHas('reservations', [
            'member_id' => $member2->member_id,
            'book_id' => $book->book_id,
            'position' => 2,
            'status' => Reservation::STATUS_WAITING,
        ]);
    }

    public function test_cancellation_shifts_subsequent_positions(): void
    {
        $book = $this->createUnavailableBook('Unavailable Book B');

        $member1 = $this->createStudent('Student 1', 'student.1@hcmue.edu.vn');
        $member2 = $this->createStudent('Student 2', 'student.2@hcmue.edu.vn');
        $member3 = $this->createStudent('Student 3', 'student.3@hcmue.edu.vn');

        $res1 = Reservation::create(['member_id' => $member1->member_id, 'book_id' => $book->book_id, 'position' => 1, 'status' => 'waiting']);
        $res2 = Reservation::create(['member_id' => $member2->member_id, 'book_id' => $book->book_id, 'position' => 2, 'status' => 'waiting']);
        $res3 = Reservation::create(['member_id' => $member3->member_id, 'book_id' => $book->book_id, 'position' => 3, 'status' => 'waiting']);

        // Member 2 cancels their reservation
        $this->actingAs($member2, 'sanctum')
            ->deleteJson("/api/reservations/{$res2->reservation_id}")
            ->assertOk()
            ->assertJsonPath('message', 'Đã hủy đặt chỗ thành công.');

        $this->assertDatabaseHas('reservations', [
            'reservation_id' => $res2->reservation_id,
            'status' => Reservation::STATUS_CANCELLED,
        ]);

        // Member 1 should remain at position 1
        $this->assertDatabaseHas('reservations', [
            'reservation_id' => $res1->reservation_id,
            'position' => 1,
        ]);

        // Member 3 should shift from 3 to 2
        $this->assertDatabaseHas('reservations', [
            'reservation_id' => $res3->reservation_id,
            'position' => 2,
        ]);
    }

    public function test_book_return_triggers_automatic_queue_progression(): void
    {
        $librarian = Librarian::query()->findOrFail(1);

        $book = Book::query()->create([
            'title' => 'Queue Test Book',
            'author' => 'Author',
            'is_available' => false,
            'is_digital' => false,
            'total_quantity' => 1,
            'available_quantity' => 0,
        ]);

        $member1 = $this->createStudent('Student X', 'student.x@hcmue.edu.vn');
        $res = Reservation::create([
            'member_id' => $member1->member_id,
            'book_id' => $book->book_id,
            'position' => 1,
            'status' => 'waiting',
        ]);

        // Active borrowing of this book by Member 2
        $member2 = $this->createStudent('Student Y', 'student.y@hcmue.edu.vn');
        $borrowing = Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => $member2->member_id,
            'status' => Borrowing::STATUS_BORROWED,
            'borrow_date' => today()->subDays(5)->toDateString(),
            'due_date' => today()->addDays(9)->toDateString(),
        ]);

        // Member 2 returns the book
        $this->actingAs($librarian, 'sanctum')
            ->postJson("/api/requests/{$borrowing->loan_id}/return")
            ->assertOk();

        // The reservation should be completed
        $this->assertDatabaseHas('reservations', [
            'reservation_id' => $res->reservation_id,
            'status' => Reservation::STATUS_COMPLETED,
        ]);

        // An approved borrowing should be automatically created for Member 1!
        $this->assertDatabaseHas('borrowing', [
            'member_id' => $member1->member_id,
            'book_id' => $book->book_id,
            'status' => Borrowing::STATUS_APPROVED,
        ]);

        // Available quantity of the book should NOT increase because it is held for Member 1!
        $this->assertDatabaseHas('books', [
            'book_id' => $book->book_id,
            'available_quantity' => 0,
        ]);
    }
}
