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
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $baseQuery = Fine::query()
            ->where('member_id', $member->member_id);

        $totalUnpaid = (float) (clone $baseQuery)
            ->where('status', Fine::STATUS_UNPAID)
            ->sum('amount');

        $paginator = (clone $baseQuery)
            ->with(['borrowing.book', 'payments'])
            ->orderByDesc('fine_id')
            ->paginate($validated['per_page'] ?? 15);

        return response()->json([
            'total_unpaid' => $totalUnpaid,
            'fines' => $paginator->getCollection()
                ->map(fn (Fine $fine) => $this->formatFine($fine, $calculator))
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
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
        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();
        $rangeStart = now()->startOfMonth()->subMonths(5);
        $rangeEnd = now()->endOfMonth();

        $totals = Fine::query()
            ->selectRaw('SUM(CASE WHEN status = ? THEN amount ELSE 0 END) as total_collected', [Fine::STATUS_PAID])
            ->selectRaw('SUM(CASE WHEN status = ? THEN amount ELSE 0 END) as total_unpaid', [Fine::STATUS_UNPAID])
            ->selectRaw('SUM(CASE WHEN status = ? THEN amount ELSE 0 END) as total_waived', [Fine::STATUS_WAIVED])
            ->selectRaw(
                'SUM(CASE WHEN status = ? AND paid_at BETWEEN ? AND ? THEN amount ELSE 0 END) as this_month_collected',
                [Fine::STATUS_PAID, $monthStart, $monthEnd],
            )
            ->first();

        $paid = DB::table('fines')
            ->selectRaw($this->monthBucket('paid_at').' as month')
            ->selectRaw('SUM(amount) as collected')
            ->selectRaw('0 as unpaid')
            ->selectRaw('0 as waived')
            ->where('status', Fine::STATUS_PAID)
            ->whereBetween('paid_at', [$rangeStart, $rangeEnd])
            ->groupBy('month');

        $unpaid = DB::table('fines')
            ->selectRaw($this->monthBucket('created_at').' as month')
            ->selectRaw('0 as collected')
            ->selectRaw('SUM(amount) as unpaid')
            ->selectRaw('0 as waived')
            ->where('status', Fine::STATUS_UNPAID)
            ->whereBetween('created_at', [$rangeStart, $rangeEnd])
            ->groupBy('month');

        $waived = DB::table('fines')
            ->selectRaw($this->monthBucket('updated_at').' as month')
            ->selectRaw('0 as collected')
            ->selectRaw('0 as unpaid')
            ->selectRaw('SUM(amount) as waived')
            ->where('status', Fine::STATUS_WAIVED)
            ->whereBetween('updated_at', [$rangeStart, $rangeEnd])
            ->groupBy('month');

        $monthlyTotals = DB::query()
            ->fromSub($paid->unionAll($unpaid)->unionAll($waived), 'monthly_fines')
            ->selectRaw('month')
            ->selectRaw('SUM(collected) as collected')
            ->selectRaw('SUM(unpaid) as unpaid')
            ->selectRaw('SUM(waived) as waived')
            ->groupBy('month')
            ->get()
            ->keyBy('month');

        $months = collect(range(5, 0))->map(function (int $offset) use ($monthlyTotals) {
            $month = now()->startOfMonth()->subMonths($offset);
            $row = $monthlyTotals->get($month->format('Y-m'));

            return [
                'month' => $month->format('Y-m'),
                'collected' => (float) ($row->collected ?? 0),
                'unpaid' => (float) ($row->unpaid ?? 0),
                'waived' => (float) ($row->waived ?? 0),
            ];
        });

        return response()->json([
            'total_collected' => (float) ($totals->total_collected ?? 0),
            'total_unpaid' => (float) ($totals->total_unpaid ?? 0),
            'total_waived' => (float) ($totals->total_waived ?? 0),
            'this_month_collected' => (float) ($totals->this_month_collected ?? 0),
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

            if ($fine->reason === Fine::REASON_OVERDUE && 
                $fine->borrowing && 
                $fine->borrowing->status !== \App\Models\Borrowing::STATUS_RETURNED) {
                abort(response()->json([
                    'message' => __('messages.borrow.pay_overdue_requires_returned')
                ], 422));
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

    public function applyWaiver(Request $request, int $fineId, FineCalculationService $calculator)
    {
        $member = $request->user();

        $fine = DB::transaction(function () use ($fineId, $member, $request) {
            $fine = Fine::query()
                ->with(['member', 'borrowing.book'])
                ->lockForUpdate()
                ->find($fineId);

            if (! $fine) {
                abort(response()->json(['message' => 'Không tìm thấy phiếu phí phạt.'], 404));
            }

            if ($fine->member_id !== $member->member_id) {
                abort(response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403));
            }

            if ($fine->status !== Fine::STATUS_UNPAID) {
                abort(response()->json(['message' => 'Khoản phí phạt này không còn ở trạng thái chưa thanh toán.'], 422));
            }

            if ($fine->reason === Fine::REASON_OVERDUE && 
                $fine->borrowing && 
                $fine->borrowing->status !== \App\Models\Borrowing::STATUS_RETURNED) {
                abort(response()->json([
                    'message' => 'Bạn cần trả sách trước khi sử dụng vé miễn phạt cho khoản phạt này.'
                ], 422));
            }

            // Find an active fine_waiver ticket
            $ticketId = $request->input('ticket_id');
            $activeTicket = null;

            if ($ticketId) {
                $activeTicket = $member->rewards()
                    ->where('id', $ticketId)
                    ->where('status', 'active')
                    ->whereHas('reward', function ($query) {
                        $query->where('benefit_type', 'fine_waiver');
                    })
                    ->where(function ($query) {
                        $query->whereNull('expires_at')
                              ->orWhere('expires_at', '>', now());
                    })
                    ->with('reward')
                    ->first();
            } else {
                // Find first ticket that actually covers the fine
                $activeTicket = $member->rewards()
                    ->where('status', 'active')
                    ->whereHas('reward', function ($query) use ($fine) {
                        $query->where('benefit_type', 'fine_waiver')
                              ->where('benefit_value', '>=', $fine->amount);
                    })
                    ->where(function ($query) {
                        $query->whereNull('expires_at')
                              ->orWhere('expires_at', '>', now());
                    })
                    ->with('reward')
                    ->first();

                // If none cover it, get the first active ticket to show the benefit_value validation error
                if (! $activeTicket) {
                    $activeTicket = $member->rewards()
                        ->where('status', 'active')
                        ->whereHas('reward', function ($query) {
                            $query->where('benefit_type', 'fine_waiver');
                        })
                        ->where(function ($query) {
                            $query->whereNull('expires_at')
                                  ->orWhere('expires_at', '>', now());
                        })
                        ->with('reward')
                        ->first();
                }
            }

            if (! $activeTicket) {
                abort(response()->json(['message' => 'Bạn không có vé miễn phạt khả dụng.'], 400));
            }

            $benefitValue = $activeTicket->reward->benefit_value;
            if ($fine->amount > $benefitValue) {
                abort(response()->json([
                    'message' => 'Vé miễn phạt này chỉ có thể áp dụng cho các khoản phạt từ ' . number_format($benefitValue) . ' VND trở xuống.'
                ], 400));
            }

            // Consume ticket
            $activeTicket->status = 'used';
            $activeTicket->used_at = now();
            $activeTicket->save();

            // Waive fine
            $fine->status = Fine::STATUS_WAIVED;
            $fine->waived_reason = "Sử dụng vé miễn phạt: " . $activeTicket->reward->name;
            $fine->save();

            // Log gamify event
            \App\Models\GamifyLog::create([
                'member_id' => $member->member_id,
                'event_type' => 'fine_waived',
                'xp_gained' => 0,
                'points_changed' => 0,
                'description' => "Sử dụng vé miễn phạt " . number_format((float) $fine->amount) . " VND thành công",
            ]);

            // Audit log
            AuditLoggerService::log(
                'waive_fine',
                'Sinh viên đã tự miễn phí phạt ' . number_format((float) $fine->amount) . ' VND bằng Vé miễn phạt: ' . $activeTicket->reward->name . ' (Mã phiếu phạt: #' . $fine->fine_id . ')',
                $member
            );

            return $fine->fresh(['member', 'borrowing.book', 'payments', 'waivedBy']);
        });

        return response()->json([
            'message' => 'Đã áp dụng vé miễn phạt thành công.',
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

    private function monthBucket(string $column): string
    {
        return match (DB::getDriverName()) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            'pgsql' => "to_char({$column}, 'YYYY-MM')",
            default => "DATE_FORMAT({$column}, '%Y-%m')",
        };
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
