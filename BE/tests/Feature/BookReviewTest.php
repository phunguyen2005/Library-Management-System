<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Librarian;
use App\Models\Member;
use App\Models\Review;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookReviewTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_can_list_reviews_publicly(): void
    {
        $book = Book::query()->firstOrFail();

        // Create a dummy review
        $member = Member::query()->findOrFail(1);
        Review::create([
            'member_id' => $member->member_id,
            'book_id' => $book->book_id,
            'loan_id' => 1,
            'rating' => 5,
            'comment' => 'Sách cực kỳ tuyệt vời, khuyên đọc!',
        ]);

        $this->getJson("/api/books/{$book->book_id}/reviews")
            ->assertOk()
            ->assertJsonStructure(['data', 'total', 'current_page'])
            ->assertJsonPath('data.0.comment', 'Sách cực kỳ tuyệt vời, khuyên đọc!')
            ->assertJsonPath('data.0.rating', 5)
            ->assertJsonPath('data.0.member.name', $member->name);
    }

    public function test_student_can_review_completed_borrowing(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-token', ['role:student']);
        
        $book = Book::query()->findOrFail(1);
        
        // Find or create a borrowing record for this student/book that is returned
        $borrowing = Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => $member->member_id,
            'status' => Borrowing::STATUS_RETURNED,
            'borrow_date' => '2026-05-20',
            'return_date' => '2026-05-22',
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson("/api/books/{$book->book_id}/reviews", [
                'rating' => 4,
                'comment' => 'Nội dung rất bổ ích.',
                'loan_id' => $borrowing->loan_id,
            ])
            ->assertCreated()
            ->assertJsonPath('message', 'Cảm ơn bạn đã gửi đánh giá!')
            ->assertJsonPath('review.rating', 4)
            ->assertJsonPath('review.comment', 'Nội dung rất bổ ích.');

        $this->assertDatabaseHas('reviews', [
            'loan_id' => $borrowing->loan_id,
            'rating' => 4,
            'comment' => 'Nội dung rất bổ ích.',
        ]);
    }

    public function test_student_cannot_review_unreturned_borrowing(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-token', ['role:student']);
        $book = Book::query()->findOrFail(1);

        $borrowing = Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => $member->member_id,
            'status' => Borrowing::STATUS_BORROWED,
            'borrow_date' => '2026-05-20',
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson("/api/books/{$book->book_id}/reviews", [
                'rating' => 4,
                'comment' => 'Chưa trả đã review.',
                'loan_id' => $borrowing->loan_id,
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Bạn chỉ có thể đánh giá sách sau khi đã hoàn thành trả sách.');
    }

    public function test_student_cannot_review_borrowing_twice(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-token', ['role:student']);
        $book = Book::query()->findOrFail(1);

        $borrowing = Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => $member->member_id,
            'status' => Borrowing::STATUS_RETURNED,
            'borrow_date' => '2026-05-20',
            'return_date' => '2026-05-22',
        ]);

        Review::create([
            'member_id' => $member->member_id,
            'book_id' => $book->book_id,
            'loan_id' => $borrowing->loan_id,
            'rating' => 5,
            'comment' => 'Review lần một',
        ]);

        $this->withToken($token->plainTextToken)
            ->postJson("/api/books/{$book->book_id}/reviews", [
                'rating' => 2,
                'comment' => 'Review lần hai',
                'loan_id' => $borrowing->loan_id,
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Bạn đã gửi đánh giá cho lượt mượn này rồi.');
    }
}
