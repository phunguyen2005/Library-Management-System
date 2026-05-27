<?php

namespace App\Http\Controllers;

use App\Http\Requests\BorrowStoreRequest;
use App\Http\Requests\BorrowingIndexRequest;
use App\Http\Requests\RejectBorrowRequest;
use App\Http\Resources\BorrowingResource;
use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Fine;
use App\Models\LibrarySetting;
use App\Models\Member;
use App\Services\FineCalculationService;
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
            $memberLocked = Member::query()->lockForUpdate()->findOrFail($member->member_id);

            $unpaidFineTotal = Fine::query()
                ->where('member_id', $memberLocked->member_id)
                ->where('status', Fine::STATUS_UNPAID)
                ->sum('amount');

            if ((float) $unpaidFineTotal > 0) {
                throw new HttpResponseException(response()->json([
                    'message' => __('messages.borrow.unpaid_fines_block'),
                ], 422));
            }

            $hasOverdueBook = Borrowing::query()
                ->where('member_id', $memberLocked->member_id)
                ->where('status', Borrowing::STATUS_BORROWED)
                ->whereNotNull('due_date')
                ->where('due_date', '<', now()->toDateString())
                ->exists();

            if ($hasOverdueBook) {
                throw new HttpResponseException(response()->json([
                    'message' => __('messages.borrow.has_overdue_book_block'),
                ], 422));
            }

            $book = Book::query()->lockForUpdate()->findOrFail($validated['book_id']);

            if ($book->available_quantity <= 0) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.book_unavailable')], 422));
            }

            $settings = LibrarySetting::singleton();
            $maxActiveLoans = max(1, (int) $settings->max_active_loans) + $memberLocked->getActiveLimitBonus();
            $activeLoanCount = Borrowing::query()
                ->where('member_id', $memberLocked->member_id)
                ->whereIn('status', [Borrowing::STATUS_PENDING, Borrowing::STATUS_APPROVED, Borrowing::STATUS_BORROWED])
                ->lockForUpdate()
                ->count();

            if ($activeLoanCount >= $maxActiveLoans) {
                throw new HttpResponseException(response()->json([
                    'message' => __('messages.borrow.active_limit_reached', ['limit' => $maxActiveLoans]),
                ], 422));
            }

            $duplicateLoan = Borrowing::query()
                ->where('member_id', $memberLocked->member_id)
                ->where('book_id', $book->book_id)
                ->whereIn('status', [Borrowing::STATUS_PENDING, Borrowing::STATUS_APPROVED, Borrowing::STATUS_BORROWED])
                ->lockForUpdate()
                ->exists();

            if ($duplicateLoan) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.duplicate_active')], 422));
            }

            if ($book->is_digital) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.digital_not_borrowable')], 422));
            }

            return Borrowing::query()->create([
                'member_id' => $memberLocked->member_id,
                'book_id' => $book->book_id,
                'status' => Borrowing::STATUS_PENDING,
                'borrow_date' => now()->toDateString(),
            ]);
        });

        $loan->load(['book', 'member']);

        \App\Services\AuditLoggerService::log('borrow_request', 'Đã yêu cầu mượn sách: ' . $loan->book->title . ' (ID Sách: ' . $loan->book_id . ', Mã phiếu: #' . $loan->loan_id . ')', $member);

        try {
            \App\Models\Librarian::all()->each(function ($librarian) use ($loan) {
                $librarian->notify(new \App\Notifications\NewBorrowRequestNotification($loan));
            });
        } catch (\Exception $e) {
            // Ignore notification failures on production
        }

        return response()->json([
            'message' => __('messages.borrow.request_created'),
            'loan' => BorrowingResource::make($loan->fresh(['book', 'member', 'librarian'])),
        ], 201);
    }

    public function approveBorrow(Request $request, int $loanId)
    {
        $librarian = $request->user();

        $loan = DB::transaction(function () use ($loanId, $librarian) {
            $loan = Borrowing::query()->lockForUpdate()->find($loanId);

            if (! $loan) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.request_not_found')], 404));
            }

            if ($loan->status !== Borrowing::STATUS_PENDING) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.request_already_processed')], 422));
            }

            $book = Book::query()->lockForUpdate()->find($loan->book_id);

            if (! $book || $book->available_quantity <= 0) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.book_no_copy_available')], 422));
            }

            $loan->status = Borrowing::STATUS_APPROVED;
            $loan->librarian_id = $librarian->librarian_id;
            $loan->save();

            $book->available_quantity = $book->available_quantity - 1;
            $book->is_available = $book->available_quantity > 0;
            $book->save();

            try {
                $loan->member->notify(new \App\Notifications\BorrowingStatusNotification($loan, 'approved'));
                $loan->member->notify(new \App\Notifications\BorrowingStatusMailNotification($loan, 'approved'));
            } catch (\Exception $e) {
                // Ignore mail sending failures on production
            }

            \App\Services\AuditLoggerService::log('borrow_approve', 'Đã duyệt yêu cầu mượn sách: ' . $loan->book->title . ' cho thành viên: ' . $loan->member->name . ' (Mã phiếu: #' . $loan->loan_id . ')', $librarian);

            return $loan->fresh(['book', 'member', 'librarian']);
        });

        return response()->json([
            'message' => __('messages.borrow.approved'),
            'loan' => BorrowingResource::make($loan),
        ]);
    }

    public function confirmPickup(Request $request, int $loanId)
    {
        $librarian = $request->user();

        $loan = DB::transaction(function () use ($loanId, $librarian) {
            $loan = Borrowing::query()->lockForUpdate()->find($loanId);

            if (! $loan) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.request_not_found')], 404));
            }

            if ($loan->status !== Borrowing::STATUS_APPROVED) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.pickup_requires_approved')], 422));
            }

            $loan->status = Borrowing::STATUS_BORROWED;
            $loan->librarian_id = $librarian->librarian_id;
            $settings = LibrarySetting::singleton();
            $loanPeriodDays = max(1, (int) $settings->loan_period_days);
            
            // Apply any active duration extensions
            $extraDays = $loan->member->consumeNextDurationBonus();
            
            $loan->borrow_date = now()->toDateString();
            $loan->due_date = now()->addDays($loanPeriodDays + $extraDays)->toDateString();
            $loan->save();

            // Award XP for checkout
            app(\App\Services\GamifyService::class)->awardXpAndPoints(
                $loan->member,
                50,
                0,
                'book_borrow',
                'Nhận sách vật lý thành công: ' . $loan->book->title
            );

            \App\Services\AuditLoggerService::log('borrow_pickup', 'Đã giao sách vật lý: ' . $loan->book->title . ' cho thành viên: ' . $loan->member->name . ' (Mã phiếu: #' . $loan->loan_id . ')', $librarian);

            return $loan->fresh(['book', 'member', 'librarian']);
        });

        return response()->json([
            'message' => __('messages.borrow.pickup_confirmed'),
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
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.request_not_found')], 404));
            }

            if ($loan->status !== Borrowing::STATUS_PENDING) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.reject_requires_pending')], 422));
            }

            $loan->status = Borrowing::STATUS_REJECTED;
            $loan->librarian_id = $librarian->librarian_id;
            $loan->rejection_reason = $reason;
            $loan->rejected_at = now();
            $loan->save();

            try {
                $loan->member->notify(new \App\Notifications\BorrowingStatusNotification($loan, 'rejected', $reason));
                $loan->member->notify(new \App\Notifications\BorrowingStatusMailNotification($loan, 'rejected', $reason));
            } catch (\Exception $e) {
                // Ignore mail sending failures on production
            }

            \App\Services\AuditLoggerService::log('borrow_reject', 'Đã từ chối yêu cầu mượn sách: ' . $loan->book->title . ' của thành viên: ' . $loan->member->name . ' (Lý do: ' . $reason . ', Mã phiếu: #' . $loan->loan_id . ')', $librarian);

            return $loan->fresh(['book', 'member', 'librarian']);
        });

        return response()->json([
            'message' => __('messages.borrow.rejected'),
            'loan' => BorrowingResource::make($loan),
        ]);
    }

    public function returnBook(Request $request, int $loanId)
    {
        $librarian = $request->user();

        $validated = $request->validate([
            'condition' => ['nullable', 'string', 'in:good,damaged,lost'],
            'condition_note' => ['nullable', 'string', 'max:500'],
        ]);

        $condition = $validated['condition'] ?? 'good';
        $conditionNote = $validated['condition_note'] ?? null;

        $loan = DB::transaction(function () use ($loanId, $librarian, $condition, $conditionNote) {
            $loan = Borrowing::query()->lockForUpdate()->find($loanId);

            if (! $loan) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.loan_not_found')], 404));
            }

            if ($loan->status !== Borrowing::STATUS_BORROWED) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.return_requires_borrowed')], 422));
            }

            $book = Book::query()->lockForUpdate()->find($loan->book_id);

            $loan->status = Borrowing::STATUS_RETURNED;
            $loan->return_date = now()->toDateString();
            
            // Check if return is overdue
            $today = now()->startOfDay();
            $due = \Carbon\Carbon::parse($loan->due_date)->startOfDay();
            $isOverdue = $today->gt($due);
            
            $loan->save();

            // Sync overdue fine (if any)
            app(FineCalculationService::class)->syncOverdueFine($loan);

            // Award return XP and Points
            $xpGained = $isOverdue ? 10 : 100;
            $pointsGained = $isOverdue ? 0 : 20;
            $eventDesc = $isOverdue 
                ? 'Trả sách quá hạn: ' . $loan->book->title 
                : 'Trả sách đúng hạn: ' . $loan->book->title;

            app(\App\Services\GamifyService::class)->awardXpAndPoints(
                $loan->member,
                $xpGained,
                $pointsGained,
                'book_return',
                $eventDesc
            );

            // Create damage / loss fine if condition is not good
            if ($condition === 'damaged' || $condition === 'lost') {
                $settings = LibrarySetting::singleton();
                $feeAmount = $condition === 'lost'
                    ? (float) ($settings->lost_book_fee ?? LibrarySetting::DEFAULT_LOST_BOOK_FEE)
                    : (float) ($settings->damaged_book_fee ?? LibrarySetting::DEFAULT_DAMAGED_BOOK_FEE);

                $reason = $condition === 'lost' ? Fine::REASON_LOST : Fine::REASON_DAMAGED;
                $reasonLabel = $condition === 'lost' ? 'Mất sách' : 'Hư hỏng sách';

                // Only create if no existing damage/loss fine for this loan
                $existingDamageFine = Fine::query()
                    ->where('loan_id', $loan->loan_id)
                    ->whereIn('reason', [Fine::REASON_DAMAGED, Fine::REASON_LOST])
                    ->first();

                if (! $existingDamageFine) {
                    Fine::create([
                        'loan_id'   => $loan->loan_id,
                        'member_id' => $loan->member_id,
                        'amount'    => $feeAmount,
                        'reason'    => $reason,
                        'status'    => Fine::STATUS_UNPAID,
                    ]);

                    $noteText = $conditionNote ? " (Ghi chú: {$conditionNote})" : '';
                    \App\Services\AuditLoggerService::log(
                        'damage_fine',
                        "{$reasonLabel}: " . $loan->book->title . ' — ' . number_format($feeAmount) . ' VND từ: ' . $loan->member->name . $noteText . ' (Mã phiếu: #' . $loan->loan_id . ')',
                        $librarian
                    );
                }
            }

            if ($book && $condition === 'good') {
                self::processNextInQueue($book->book_id);
            } elseif ($book && $condition === 'damaged') {
                $book->repairing_quantity = ($book->repairing_quantity ?? 0) + 1;
                $book->save();
            } elseif ($book && $condition === 'lost') {
                // Lost book: do NOT restore inventory (book is gone)
                $book->total_quantity = max(0, $book->total_quantity - 1);
                $book->is_available = $book->available_quantity > 0;
                $book->save();
            }

            try {
                $loan->member->notify(new \App\Notifications\BorrowingStatusNotification($loan, 'returned'));
                $loan->member->notify(new \App\Notifications\BorrowingStatusMailNotification($loan, 'returned'));
            } catch (\Exception $e) {
                // Ignore mail sending failures on production
            }

            \App\Services\AuditLoggerService::log('borrow_return', 'Đã nhận sách trả: ' . $loan->book->title . ' từ thành viên: ' . $loan->member->name . ' (Tình trạng: ' . $condition . ', Mã phiếu: #' . $loan->loan_id . ')', $librarian);

            return $loan->fresh(['book', 'member', 'librarian', 'fine']);
        });

        return response()->json([
            'message' => __('messages.borrow.returned'),
            'loan' => BorrowingResource::make($loan),
        ]);
    }

    /**
     * Student cancels their own pending borrow request.
     */
    public function cancelBorrow(Request $request, int $loanId)
    {
        $member = $request->user();

        $loan = DB::transaction(function () use ($loanId, $member) {
            $loan = Borrowing::query()->lockForUpdate()->find($loanId);

            if (! $loan) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.request_not_found')], 404));
            }

            if ($loan->member_id !== $member->member_id) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.cancel_forbidden')], 403));
            }

            if ($loan->status !== Borrowing::STATUS_PENDING) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.cancel_requires_pending')], 422));
            }

            $loan->status = Borrowing::STATUS_CANCELLED;
            $loan->rejection_reason = __('messages.borrow.cancelled_by_student');
            $loan->rejected_at = now();
            $loan->save();

            \App\Services\AuditLoggerService::log(
                'borrow_cancel',
                'Sinh viên đã hủy yêu cầu mượn sách: ' . $loan->book->title . ' (Mã phiếu: #' . $loan->loan_id . ')',
                $member
            );

            return $loan->fresh(['book', 'member']);
        });

        return response()->json([
            'message' => __('messages.borrow.cancelled'),
            'loan' => BorrowingResource::make($loan),
        ]);
    }

    /**
     * Admin extends the due date of a borrowed book.
     */
    public function extendLoan(Request $request, int $loanId)
    {
        $librarian = $request->user();

        $validated = $request->validate([
            'extra_days' => ['required', 'integer', 'min:1', 'max:30'],
        ]);

        $extraDays = (int) $validated['extra_days'];

        $loan = DB::transaction(function () use ($loanId, $librarian, $extraDays) {
            $loan = Borrowing::query()->lockForUpdate()->find($loanId);

            if (! $loan) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.loan_not_found')], 404));
            }

            if ($loan->status !== Borrowing::STATUS_BORROWED) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.extend_requires_borrowed')], 422));
            }

            if (! $loan->due_date) {
                throw new HttpResponseException(response()->json(['message' => __('messages.borrow.extend_requires_due_date')], 422));
            }

            $oldDueDate = $loan->due_date->toDateString();
            $loan->due_date = $loan->due_date->addDays($extraDays);
            $loan->save();

            // If now within the new deadline, cancel any existing overdue fine
            $today = now()->startOfDay();
            $newDue = $loan->due_date->copy()->startOfDay();
            if ($newDue->gte($today)) {
                Fine::query()
                    ->where('loan_id', $loan->loan_id)
                    ->where('reason', Fine::REASON_OVERDUE)
                    ->where('status', Fine::STATUS_UNPAID)
                    ->update(['status' => Fine::STATUS_CANCELLED]);
            }

            \App\Services\AuditLoggerService::log(
                'borrow_extend',
                'Đã gia hạn phiếu mượn: ' . $loan->book->title . ' cho: ' . $loan->member->name .
                ' (Từ: ' . $oldDueDate . ' → Đến: ' . $loan->due_date->toDateString() . ', Mã phiếu: #' . $loan->loan_id . ')',
                $librarian
            );

            try {
                $loan->member->notify(new \App\Notifications\BorrowingStatusNotification($loan, 'extended'));
            } catch (\Exception $e) {
                // Ignore notification failures on production
            }

            return $loan->fresh(['book', 'member', 'librarian', 'fine']);
        });

        return response()->json([
            'message' => __('messages.borrow.extended'),
            'loan' => BorrowingResource::make($loan),
            'new_due_date' => $loan->due_date->toDateString(),
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
            ->with(['member', 'book', 'librarian', 'fine'])
            ->withExists('review')
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
                    });

                if (preg_match('/^SACH-(\d+)$/i', $search, $matches)) {
                    $builder->orWhere('book_id', (int) $matches[1]);
                } elseif (is_numeric($search)) {
                    $builder->orWhere('book_id', (int) $search)
                            ->orWhere('loan_id', (int) $search);
                }

                $builder->orWhere('status', 'like', '%'.$search.'%');
            });
        }

        return $query;
    }

    public static function processNextInQueue(int $bookId): void
    {
        DB::transaction(function () use ($bookId) {
            $book = Book::query()->lockForUpdate()->find($bookId);
            if (!$book) return;

            $nextReservation = \App\Models\Reservation::query()
                ->where('book_id', $bookId)
                ->where('status', \App\Models\Reservation::STATUS_WAITING)
                ->orderBy('position', 'asc')
                ->lockForUpdate()
                ->first();

            if ($nextReservation) {
                // Complete the reservation
                $nextReservation->status = \App\Models\Reservation::STATUS_COMPLETED;
                $nextReservation->save();

                // Shift remaining positions
                \App\Models\Reservation::where('book_id', $bookId)
                    ->where('status', \App\Models\Reservation::STATUS_WAITING)
                    ->where('position', '>', $nextReservation->position)
                    ->decrement('position');

                // Create approved borrowing request
                $borrowing = Borrowing::create([
                    'book_id' => $bookId,
                    'member_id' => $nextReservation->member_id,
                    'status' => Borrowing::STATUS_APPROVED,
                    'borrow_date' => now()->toDateString(),
                ]);

                // Send in-app notification
                $nextReservation->member->notify(new \App\Notifications\BorrowingStatusNotification($borrowing, 'approved'));

                // Send mail
                try {
                    $nextReservation->member->notify(new \App\Notifications\BorrowingStatusMailNotification($borrowing, 'approved', null, true));
                } catch (\Exception $e) {
                    // Ignore mail failures in tests/local
                }
            } else {
                // No reservations, just release to available inventory
                $totalQuantity = max(0, (int) $book->total_quantity);
                $nextAvailable = min($totalQuantity, (int) $book->available_quantity + 1);
                $book->available_quantity = $nextAvailable;
                $book->is_available = $nextAvailable > 0;
                $book->save();
            }
        });
    }
}
