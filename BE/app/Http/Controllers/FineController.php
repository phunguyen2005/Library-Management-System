<?php

namespace App\Http\Controllers;

use App\Models\Fine;
use App\Models\FinePayment;
use App\Notifications\FineStatusNotification;
use App\Services\AuditLoggerService;
use App\Services\FineCalculationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FineController extends Controller
{
    public function me(Request $request, FineCalculationService $calculator)
    {
        $member = $request->user();

        $fines = Fine::query()
            ->with(['borrowing.book', 'payments'])
            ->where('member_id', $member->member_id)
            ->orderByDesc('fine_id')
            ->get();

        $totalUnpaid = (float) $fines
            ->where('status', Fine::STATUS_UNPAID)
            ->sum(fn (Fine $fine) => (float) $fine->amount);

        return response()->json([
            'total_unpaid' => $totalUnpaid,
            'fines' => $fines->map(fn (Fine $fine) => $this->formatFine($fine, $calculator))->values(),
        ]);
    }

    public function summary(Request $request)
    {
        $member = $request->user();

        $query = Fine::query()
            ->where('member_id', $member->member_id)
            ->where('status', Fine::STATUS_UNPAID);

        $totalUnpaid = (float) (clone $query)->sum('amount');
        $count = (clone $query)->count();

        return response()->json([
            'has_unpaid' => $count > 0,
            'total_unpaid' => $totalUnpaid,
            'count' => $count,
        ]);
    }

    public function adminIndex(Request $request, FineCalculationService $calculator)
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:unpaid,paid,waived,cancelled'],
            'member_id' => ['nullable', 'integer', 'exists:members,member_id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'query' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Fine::query()
            ->with(['member', 'borrowing.book', 'payments', 'waivedBy'])
            ->orderByDesc('fine_id');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['member_id'])) {
            $query->where('member_id', $validated['member_id']);
        }

        if (! empty($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }

        if (! empty($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }

        $search = trim((string) ($validated['query'] ?? ''));
        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search) {
                $builder
                    ->where('fine_id', $search)
                    ->orWhere('status', 'like', '%'.$search.'%')
                    ->orWhere('reason', 'like', '%'.$search.'%')
                    ->orWhereHas('member', function (Builder $memberQuery) use ($search) {
                        $memberQuery
                            ->where('name', 'like', '%'.$search.'%')
                            ->orWhere('email', 'like', '%'.$search.'%');
                    })
                    ->orWhereHas('borrowing.book', function (Builder $bookQuery) use ($search) {
                        $bookQuery
                            ->where('title', 'like', '%'.$search.'%')
                            ->orWhere('author', 'like', '%'.$search.'%');
                    });
            });
        }

        $paginator = $query->paginate($validated['per_page'] ?? 15);

        return response()->json([
            'data' => $paginator->getCollection()
                ->map(fn (Fine $fine) => $this->formatFine($fine, $calculator, true))
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function statistics()
    {
        $totalCollected = (float) Fine::query()->where('status', Fine::STATUS_PAID)->sum('amount');
        $totalUnpaid = (float) Fine::query()->where('status', Fine::STATUS_UNPAID)->sum('amount');
        $totalWaived = (float) Fine::query()->where('status', Fine::STATUS_WAIVED)->sum('amount');
        $thisMonthCollected = (float) Fine::query()
            ->where('status', Fine::STATUS_PAID)
            ->whereYear('paid_at', now()->year)
            ->whereMonth('paid_at', now()->month)
            ->sum('amount');

        $months = collect(range(5, 0))->map(function (int $offset) {
            $month = now()->startOfMonth()->subMonths($offset);

            return [
                'month' => $month->format('Y-m'),
                'collected' => (float) Fine::query()
                    ->where('status', Fine::STATUS_PAID)
                    ->whereYear('paid_at', $month->year)
                    ->whereMonth('paid_at', $month->month)
                    ->sum('amount'),
                'unpaid' => (float) Fine::query()
                    ->where('status', Fine::STATUS_UNPAID)
                    ->whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month)
                    ->sum('amount'),
                'waived' => (float) Fine::query()
                    ->where('status', Fine::STATUS_WAIVED)
                    ->whereYear('updated_at', $month->year)
                    ->whereMonth('updated_at', $month->month)
                    ->sum('amount'),
            ];
        });

        return response()->json([
            'total_collected' => $totalCollected,
            'total_unpaid' => $totalUnpaid,
            'total_waived' => $totalWaived,
            'this_month_collected' => $thisMonthCollected,
            'by_month' => $months,
        ]);
    }

    public function pay(Request $request, int $fineId, FineCalculationService $calculator)
    {
        $validated = $request->validate([
            'method' => ['nullable', 'string', 'in:cash,momo,vnpay,transfer'],
            'note' => ['nullable', 'string', 'max:500'],
            'transaction_ref' => ['nullable', 'string', 'max:100', 'unique:fine_payments,transaction_ref'],
        ]);

        $librarian = $request->user();

        $fine = DB::transaction(function () use ($fineId, $librarian, $validated) {
            $fine = Fine::query()
                ->with(['member', 'borrowing.book'])
                ->lockForUpdate()
                ->find($fineId);

            if (! $fine) {
                abort(response()->json(['message' => 'Không tìm thấy phiếu phí phạt.'], 404));
            }

            if ($fine->status !== Fine::STATUS_UNPAID) {
                abort(response()->json(['message' => 'Khoản phí phạt này không còn ở trạng thái chưa thanh toán.'], 422));
            }

            $payment = FinePayment::query()->create([
                'fine_id' => $fine->fine_id,
                'amount_paid' => $fine->amount,
                'method' => $validated['method'] ?? FinePayment::METHOD_CASH,
                'transaction_ref' => $validated['transaction_ref'] ?? null,
                'status' => FinePayment::STATUS_COMPLETED,
                'collected_by' => $librarian->librarian_id,
                'gateway_response' => ! empty($validated['note'])
                    ? ['note' => $validated['note']]
                    : null,
            ]);

            $fine->status = Fine::STATUS_PAID;
            $fine->paid_at = now();
            $fine->save();

            $bookTitle = $fine->borrowing?->book?->title ?? 'Tài liệu';
            AuditLoggerService::log(
                'collect_fine',
                'Đã thu phí phạt ' . number_format((float) $fine->amount) . ' VND từ thành viên: ' . $fine->member->name . ' cho sách: ' . $bookTitle . ' (Mã phiếu phạt: #' . $fine->fine_id . ')',
                $librarian
            );

            $fine->member->notify(new FineStatusNotification($fine->fresh(['borrowing.book']), Fine::STATUS_PAID));

            return $fine->fresh(['member', 'borrowing.book', 'payments', 'waivedBy']);
        });

        return response()->json([
            'message' => 'Đã xác nhận đóng phí phạt thành công.',
            'fine' => $this->formatFine($fine, $calculator, true),
        ]);
    }

    public function waive(Request $request, int $fineId, FineCalculationService $calculator)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $librarian = $request->user();

        $fine = DB::transaction(function () use ($fineId, $librarian, $validated) {
            $fine = Fine::query()
                ->with(['member', 'borrowing.book'])
                ->lockForUpdate()
                ->find($fineId);

            if (! $fine) {
                abort(response()->json(['message' => 'Không tìm thấy phiếu phí phạt.'], 404));
            }

            if ($fine->status === Fine::STATUS_PAID) {
                abort(response()->json(['message' => 'Không thể miễn khoản phạt đã thanh toán.'], 422));
            }

            if ($fine->status !== Fine::STATUS_UNPAID) {
                abort(response()->json(['message' => 'Chỉ có thể miễn khoản phạt chưa thanh toán.'], 422));
            }

            $fine->status = Fine::STATUS_WAIVED;
            $fine->waived_by = $librarian->librarian_id;
            $fine->waived_reason = $validated['reason'];
            $fine->save();

            $bookTitle = $fine->borrowing?->book?->title ?? 'Tài liệu';
            AuditLoggerService::log(
                'waive_fine',
                'Đã miễn phí phạt ' . number_format((float) $fine->amount) . ' VND cho thành viên: ' . $fine->member->name . ' cho sách: ' . $bookTitle . ' (Lý do: ' . $validated['reason'] . ', Mã phiếu phạt: #' . $fine->fine_id . ')',
                $librarian
            );

            $fine->member->notify(new FineStatusNotification($fine->fresh(['borrowing.book']), Fine::STATUS_WAIVED));

            return $fine->fresh(['member', 'borrowing.book', 'payments', 'waivedBy']);
        });

        return response()->json([
            'message' => 'Đã miễn phạt thành công.',
            'fine' => $this->formatFine($fine, $calculator, true),
        ]);
    }

    public function store(Request $request, FineCalculationService $calculator)
    {
        $validated = $request->validate([
            'member_id' => ['required', 'integer', 'exists:members,member_id'],
            'loan_id' => ['nullable', 'integer', 'exists:borrowing,loan_id'],
            'amount' => ['required', 'numeric', 'min:1000'],
            'reason' => ['required', 'string', 'in:overdue,damaged,lost'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $librarian = $request->user();

        // If loan_id is provided, verify it belongs to the member
        if (! empty($validated['loan_id'])) {
            $borrowing = \App\Models\Borrowing::query()->find($validated['loan_id']);
            if ($borrowing->member_id !== (int) $validated['member_id']) {
                return response()->json([
                    'message' => 'Phiếu mượn không thuộc về thành viên được chọn.'
                ], 422);
            }
        }

        $fine = DB::transaction(function () use ($validated, $librarian) {
            $fine = Fine::create([
                'member_id' => $validated['member_id'],
                'loan_id' => $validated['loan_id'] ?? null,
                'amount' => $validated['amount'],
                'reason' => $validated['reason'],
                'status' => Fine::STATUS_UNPAID,
                'notes' => $validated['notes'] ?? null,
            ]);

            $member = \App\Models\Member::find($validated['member_id']);
            $bookTitle = $fine->borrowing?->book?->title ?? 'Tài liệu không liên kết phiếu mượn';
            $reasonText = $validated['reason'] === 'damaged' ? 'Hư hỏng sách' : ($validated['reason'] === 'lost' ? 'Mất sách' : 'Quá hạn');

            AuditLoggerService::log(
                'create_fine',
                'Thủ thư đã tạo khoản phạt thủ công: ' . number_format((float) $fine->amount) . ' VND cho thành viên ' . $member->name . ' (Lý do: ' . $reasonText . ', Sách: ' . $bookTitle . ')',
                $librarian
            );

            // Send notification to member
            $member->notify(new FineStatusNotification($fine->fresh(['borrowing.book']), Fine::STATUS_UNPAID));

            return $fine;
        });

        return response()->json([
            'message' => 'Đã tạo khoản phạt thủ công thành công.',
            'fine' => $this->formatFine($fine->load(['member', 'borrowing.book', 'payments']), $calculator, true),
        ], 201);
    }

    private function formatFine(Fine $fine, FineCalculationService $calculator, bool $includeMember = false): array
    {
        $borrowing = $fine->borrowing;
        $book = $borrowing?->book;
        $calculation = $borrowing
            ? $calculator->calculate($borrowing)
            : ['days_overdue' => 0];

        $payload = [
            'fine_id' => $fine->fine_id,
            'loan_id' => $fine->loan_id,
            'member_id' => $fine->member_id,
            'book_title' => $book?->title,
            'due_date' => $borrowing?->due_date?->toDateString(),
            'return_date' => $borrowing?->return_date?->toDateString(),
            'days_overdue' => (int) $calculation['days_overdue'],
            'amount' => (float) $fine->amount,
            'reason' => $fine->reason,
            'status' => $fine->status,
            'notes' => $fine->notes,
            'paid_at' => $fine->paid_at?->toIso8601String(),
            'waived_by' => $fine->waived_by,
            'waived_reason' => $fine->waived_reason,
            'created_at' => $fine->created_at?->toIso8601String(),
            'updated_at' => $fine->updated_at?->toIso8601String(),
            'payments' => $fine->relationLoaded('payments')
                ? $fine->payments
                    ->sortByDesc('payment_id')
                    ->map(fn (FinePayment $payment) => [
                        'payment_id' => $payment->payment_id,
                        'amount_paid' => (float) $payment->amount_paid,
                        'method' => $payment->method,
                        'transaction_ref' => $payment->transaction_ref,
                        'status' => $payment->status,
                        'collected_by' => $payment->collected_by,
                        'created_at' => $payment->created_at?->toIso8601String(),
                    ])
                    ->values()
                : [],
        ];

        if ($includeMember) {
            $payload['member'] = $fine->member ? [
                'member_id' => $fine->member->member_id,
                'name' => $fine->member->name,
                'email' => $fine->member->email,
            ] : null;
        }

        return $payload;
    }
}
