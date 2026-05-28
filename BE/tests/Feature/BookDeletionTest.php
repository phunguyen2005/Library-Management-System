<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BookDeletionTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_physical_book_with_borrowings_cannot_be_deleted(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-access', ['role:admin']);

        // Create a physical book
        $book = Book::query()->create([
            'title' => 'Physical Book Test Deletion',
            'author' => 'Author Test',
            'genre' => 'Technology',
            'published_year' => 2026,
            'is_available' => true,
            'location' => 'C1',
            'is_digital' => false,
            'total_quantity' => 1,
            'available_quantity' => 1,
        ]);

        // Create a borrowing record
        Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => 3,
            'status' => Borrowing::STATUS_PENDING,
            'borrow_date' => today()->toDateString(),
        ]);

        $response = $this->withToken($token->plainTextToken)
            ->deleteJson("/api/books/{$book->book_id}")
            ->assertStatus(422);

        $response->assertJson([
            'message' => 'Không thể xóa sách đã có lịch sử mượn.',
        ]);

        $this->assertDatabaseHas('books', [
            'book_id' => $book->book_id,
            'deleted_at' => null,
        ]);
    }

    public function test_physical_book_without_borrowings_can_be_deleted(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-access', ['role:admin']);

        // Create a physical book
        $book = Book::query()->create([
            'title' => 'Physical Book Test Deletion 2',
            'author' => 'Author Test',
            'genre' => 'Technology',
            'published_year' => 2026,
            'is_available' => true,
            'location' => 'C1',
            'is_digital' => false,
            'total_quantity' => 1,
            'available_quantity' => 1,
        ]);

        $this->withToken($token->plainTextToken)
            ->deleteJson("/api/books/{$book->book_id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('books', [
            'book_id' => $book->book_id,
        ]);
    }

    public function test_digital_book_with_borrowings_can_be_deleted(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-access', ['role:admin']);

        // Create a digital book
        $book = Book::query()->create([
            'title' => 'Digital Book Test Deletion',
            'author' => 'Author Test',
            'genre' => 'Technology',
            'published_year' => 2026,
            'is_available' => false,
            'location' => null,
            'is_digital' => true,
            'total_quantity' => 0,
            'available_quantity' => 0,
        ]);

        // Create a borrowing record (e.g. from legacy or anomaly)
        Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => 3,
            'status' => Borrowing::STATUS_PENDING,
            'borrow_date' => today()->toDateString(),
        ]);

        $this->withToken($token->plainTextToken)
            ->deleteJson("/api/books/{$book->book_id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('books', [
            'book_id' => $book->book_id,
        ]);
    }
}
