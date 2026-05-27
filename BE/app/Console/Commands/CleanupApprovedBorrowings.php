<?php

namespace App\Console\Commands;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\LibrarySetting;
use App\Notifications\BorrowingStatusNotification;
use App\Notifications\BorrowingStatusMailNotification;
use App\Services\AuditLoggerService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupApprovedBorrowings extends Command
{
    protected $signature = 'borrowings:cleanup-approved';

    protected $description = 'Tự động hủy phiếu mượn đã duyệt nhưng sinh viên không đến nhận trong thời hạn cấu hình.';

    public function handle(): int
    {
        $settings = LibrarySetting::singleton();
        $deadlineHours = max(1, (int) ($settings->pickup_deadline_hours ?? LibrarySetting::DEFAULT_PICKUP_DEADLINE_HOURS));
        $cutoff = now()->subHours($deadlineHours);

        $expiredLoans = Borrowing::query()
            ->where('status', Borrowing::STATUS_APPROVED)
            ->whereNotNull('approved_at')
            ->where('approved_at', '<=', $cutoff)
            ->with(['book', 'member'])
            ->get();

        if ($expiredLoans->isEmpty()) {
            $this->info('Không có phiếu nào hết hạn nhận sách.');
            return Command::SUCCESS;
        }

        $count = 0;

        foreach ($expiredLoans as $loan) {
            DB::transaction(function () use ($loan, $deadlineHours, &$count) {
                $fresh = Borrowing::query()->lockForUpdate()->find($loan->loan_id);

                if (! $fresh || $fresh->status !== Borrowing::STATUS_APPROVED) {
                    return;
                }

                $fresh->status = Borrowing::STATUS_CANCELLED;
                $fresh->rejection_reason = "Hết thời hạn {$deadlineHours}h nhận sách — tự động hủy bởi hệ thống";
                $fresh->rejected_at = now();
                $fresh->save();

                // Process next person in the reservation queue for this book, or restore inventory
                $book = Book::query()->lockForUpdate()->find($fresh->book_id);
                if ($book) {
                    \App\Http\Controllers\BorrowController::processNextInQueue($book->book_id);
                }

                AuditLoggerService::log(
                    'borrow_expire',
                    'Tự động hủy phiếu đã duyệt quá hạn nhận ' . $deadlineHours . 'h: ' .
                    $loan->book?->title . ' của ' . $loan->member?->name .
                    ' (Mã phiếu: #' . $fresh->loan_id . ')',
                    null
                );

                try {
                    $fresh->member?->notify(new BorrowingStatusNotification($fresh, 'expired'));
                    $fresh->member?->notify(new BorrowingStatusMailNotification($fresh, 'expired'));
                } catch (\Exception $e) {
                    // Ignore notification failures in local/test
                }

                // Check if member should be suspended due to repeated violations
                $member = $fresh->member;
                if ($member) {
                    $settings = LibrarySetting::singleton();
                    $maxMissed = (int) ($settings->max_missed_pickups ?? LibrarySetting::DEFAULT_MAX_MISSED_PICKUPS);
                    $suspensionDays = (int) ($settings->suspension_duration_days ?? LibrarySetting::DEFAULT_SUSPENSION_DURATION_DAYS);

                    $missedCount = Borrowing::where('member_id', $member->member_id)
                        ->where('status', Borrowing::STATUS_CANCELLED)
                        ->where('rejection_reason', 'like', '%Hết thời hạn%nhận sách%')
                        ->where('rejected_at', '>=', now()->subDays(14))
                        ->count();

                    if ($missedCount > $maxMissed) {
                        $member->borrow_suspended_until = now()->addDays($suspensionDays);
                        $member->save();

                        AuditLoggerService::log(
                            'member_suspend',
                            "Tài khoản sinh viên {$member->name} bị tạm khóa quyền mượn {$suspensionDays} ngày (đến " . now()->addDays($suspensionDays)->format('d/m/Y H:i') . ") do quá {$maxMissed} lần không đến nhận sách.",
                            null
                        );

                        try {
                            $member->notify(new \App\Notifications\MemberSuspendedNotification($suspensionDays, $member->borrow_suspended_until));
                        } catch (\Exception $e) {
                            // ignore notification failures
                        }
                    }
                }

                $count++;
            });
        }

        $this->info("Đã tự động hủy {$count} phiếu mượn đã duyệt quá hạn nhận sách ({$deadlineHours}h).");

        return Command::SUCCESS;
    }
}
