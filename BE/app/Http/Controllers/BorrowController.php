<?php

namespace App\Http\Controllers;

use App\Http\Requests\BorrowStoreRequest;
use App\Http\Requests\BorrowingIndexRequest;
use App\Http\Requests\RejectBorrowRequest;
use App\Http\Resources\BorrowingResource;
use App\Models\Book;
use App\Models\Borrowing;
use App\Models\LibrarySetting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BorrowController extends Controller
{
    public function requestBorrow(BorrowStoreRequest $request)
    {
        $member = $request->user();
        $validated = $request->validated();

        $loan = DB::transaction(function () use ($member, $validated) {
            $book = Book::query()->lockForUpdate()->findOrFail($validated['book_id']);

            if ($book->available_quantity <= 0) {
                throw new HttpResponseException(response()->json(['message' => 'Sách hiện không có sẵn để mượn.'], 422));
            }

            $settings = LibrarySetting::singleton();
            $maxActiveLoans = max(1, (int) $settings->max_active_loans);
            $activeLoanCount = Borrowing::query()
                ->where('member_id', $member->member_id)
                ->whereIn('status', ['pending', 'borrowed'])
                ->lockForUpdate()
                ->count();

            if ($activeLoanCount >= $maxActiveLoans) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Bạn đã đạt giới hạn '.$maxActiveLoans.' yêu cầu đang hoạt động.',
                ], 422));
            }

            $duplicateLoan = Borrowing::query()
                ->where('member_id', $member->member_id)
                ->where('book_id', $book->book_id)
                ->whereIn('status', ['pending', 'borrowed'])
                ->lockForUpdate()
                ->exists();

            if ($duplicateLoan) {
                throw new HttpResponseException(response()->json(['message' => 'Bạn đã có một yêu cầu hoặc phiếu mượn cho cuốn sách này.'], 422));
            }

            if ($book->is_digital) {
                throw new HttpResponseException(response()->json(['message' => 'Tài liệu số không thể được mượn như sách vật lý.'], 422));
            }

            return Borrowing::query()->create([
                'member_id' => $member->member_id,
                'book_id' => $book->book_id,
                'status' => 'pending',
                'borrow_date' => now()->toDateString(),
            ]);
        });

        return response()->json([
            'message' => 'Yêu cầu mượn sách đã được gửi.',
            'loan' => BorrowingResource::make($loan->fresh(['book', 'member', 'librarian'])),
        ], 201);
    }

    public function approveBorrow(Request $request, int $loanId)
    {
        $librarian = $request->user();

        $loan = DB::transaction(function () use ($loanId, $librarian) {
            $loan = Borrowing::query()->lockForUpdate()->find($loanId);

            if (! $loan) {
                throw new HttpResponseException(response()->json(['message' => 'Không tìm thấy yêu cầu mượn.'], 404));
            }

            if ($loan->status !== 'pending') {
                throw new HttpResponseException(response()->json(['message' => 'Yêu cầu này đã được xử lý.'], 422));
            }

            $book = Book::query()->lockForUpdate()->find($loan->book_id);

            if (! $book || $book->available_quantity <= 0) {
                throw new HttpResponseException(response()->json(['message' => 'Sách hiện không còn bản sao khả dụng.'], 422));
            }

            $loan->status = 'borrowed';
            $loan->librarian_id = $librarian->librarian_id;
            $settings = LibrarySetting::singleton();
            $loanPeriodDays = max(1, (int) $settings->loan_period_days);
            $loan->due_date = now()->addDays($loanPeriodDays)->toDateString();
            $loan->save();

            $book->available_quantity = $book->available_quantity - 1;
            $book->is_available = $book->available_quantity > 0;
            $book->save();

            return $loan->fresh(['book', 'member', 'librarian']);
        });

        return response()->json([
            'message' => 'Đã duyệt yêu cầu mượn sách.',
            'loan' => BorrowingResource::make($loan),
        ]);
    }

    public function rejectBorrow(RejectBorrowRequest $request, int $loanId)
    {
        $librarian = $request->user();
        $reason = $request->validated('reason');

        $loan = DB::transaction(function () use ($loanId, $librarian, $reason) {
            $loan = Borrowing::query()->lockForUpdate()->find($loanId);

            if (! $loan) {
                throw new HttpResponseException(response()->json(['message' => 'Không tìm thấy yêu cầu mượn.'], 404));
            }

            if ($loan->status !== 'pending') {
                throw new HttpResponseException(response()->json(['message' => 'Chỉ có thể từ chối yêu cầu đang chờ duyệt.'], 422));
            }

            $loan->status = 'rejected';
            $loan->librarian_id = $librarian->librarian_id;
            $loan->rejection_reason = $reason;
            $loan->rejected_at = now();
            $loan->save();

            return $loan->fresh(['book', 'member', 'librarian']);
        });

        return response()->json([
            'message' => 'Đã từ chối yêu cầu mượn sách.',
            'loan' => BorrowingResource::make($loan),
        ]);
    }

    public function returnBook(Request $request, int $loanId)
    {
        $loan = DB::transaction(function () use ($loanId) {
            $loan = Borrowing::query()->lockForUpdate()->find($loanId);

            if (! $loan) {
                throw new HttpResponseException(response()->json(['message' => 'Không tìm thấy phiếu mượn.'], 404));
            }

            if ($loan->status !== 'borrowed') {
                throw new HttpResponseException(response()->json(['message' => 'Chỉ có thể trả sách đang ở trạng thái đang mượn.'], 422));
            }

            $book = Book::query()->lockForUpdate()->find($loan->book_id);

            $loan->status = 'returned';
            $loan->return_date = now()->toDateString();
            $loan->save();

            if ($book) {
                $totalQuantity = max(0, (int) $book->total_quantity);
                $nextAvailable = min($totalQuantity, (int) $book->available_quantity + 1);
                $book->available_quantity = $nextAvailable;
                $book->is_available = $nextAvailable > 0;
                $book->save();
            }

            return $loan->fresh(['book', 'member', 'librarian']);
        });

        return response()->json([
            'message' => 'Đã xử lý trả sách.',
            'loan' => BorrowingResource::make($loan),
        ]);
    }

    public function getAllRequests(BorrowingIndexRequest $request)
    {
        $validated = $request->validated();
        $requests = $this->buildBorrowingQuery($validated)
            ->paginate($validated['limit'] ?? 15, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString();

        return BorrowingResource::collection($requests);
    }

    public function getMemberRequests(BorrowingIndexRequest $request)
    {
        $validated = $request->validated();
        $requests = $this->buildBorrowingQuery($validated, $request->user()->member_id)
            ->paginate($validated['limit'] ?? 15, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString();

        return BorrowingResource::collection($requests);
    }

    private function buildBorrowingQuery(array $filters, ?int $memberId = null): Builder
    {
        $query = Borrowing::query()
            ->with(['member', 'book', 'librarian'])
            ->orderByDesc('loan_id');

        if ($memberId !== null) {
            $query->where('member_id', $memberId);
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['member_id'])) {
            $query->where('member_id', $filters['member_id']);
        }

        if (! empty($filters['book_id'])) {
            $query->where('book_id', $filters['book_id']);
        }

        $search = trim((string) ($filters['query'] ?? ''));

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search) {
                $builder
                    ->whereHas('member', function (Builder $memberQuery) use ($search) {
                        $memberQuery
                            ->where('name', 'like', '%'.$search.'%')
                            ->orWhere('email', 'like', '%'.$search.'%');
                    })
                    ->orWhereHas('book', function (Builder $bookQuery) use ($search) {
                        $bookQuery
                            ->where('title', 'like', '%'.$search.'%')
                            ->orWhere('author', 'like', '%'.$search.'%');
                    })
                    ->orWhere('status', 'like', '%'.$search.'%');
            });
        }

        return $query;
    }
}
