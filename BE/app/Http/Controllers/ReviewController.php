<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewController extends Controller
{
    public function index(Request $request, int $bookId)
    {
        $book = Book::findOrFail($bookId);

        $reviews = Review::query()
            ->where('book_id', $book->book_id)
            ->with(['member:member_id,name'])
            ->orderByDesc('created_at')
            ->paginate($request->query('limit', 10));

        return response()->json($reviews);
    }

    public function store(Request $request, int $bookId)
    {
        $member = $request->user();
        
        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'loan_id' => 'required|integer',
        ]);

        $book = Book::findOrFail($bookId);

        // Verify borrowing record belongs to this member, matches this book, is in returned status, and has no existing review
        $borrowing = Borrowing::query()
            ->where('loan_id', $validated['loan_id'])
            ->where('member_id', $member->member_id)
            ->where('book_id', $book->book_id)
            ->first();

        if (!$borrowing) {
            return response()->json(['message' => 'Không tìm thấy lượt mượn sách hợp lệ.'], 404);
        }

        if ($borrowing->status !== Borrowing::STATUS_RETURNED) {
            return response()->json(['message' => 'Bạn chỉ có thể đánh giá sách sau khi đã hoàn thành trả sách.'], 422);
        }

        $existingReview = Review::where('loan_id', $borrowing->loan_id)->exists();
        if ($existingReview) {
            return response()->json(['message' => 'Bạn đã gửi đánh giá cho lượt mượn này rồi.'], 422);
        }

        $review = DB::transaction(function () use ($member, $book, $borrowing, $validated) {
            return Review::create([
                'member_id' => $member->member_id,
                'book_id' => $book->book_id,
                'loan_id' => $borrowing->loan_id,
                'rating' => $validated['rating'],
                'comment' => $validated['comment'] ?? null,
            ]);
        });

        $review->load(['member:member_id,name']);

        // Format book's new rating to send back
        $avgRating = (float) round($book->reviews()->avg('rating') ?? 0, 1);
        $reviewsCount = (int) $book->reviews()->count();

        return response()->json([
            'message' => 'Cảm ơn bạn đã gửi đánh giá!',
            'review' => $review,
            'avg_rating' => $avgRating,
            'reviews_count' => $reviewsCount,
        ], 201);
    }
}
