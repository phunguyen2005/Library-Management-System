<?php

namespace App\Console\Commands;

use App\Models\Borrowing;
use App\Models\Fine;
use App\Services\FineCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CalculateOverdueFines extends Command
{
    protected $signature = 'borrowings:calculate-fines';
    protected $description = 'Tính toán lũy tiến tiền phạt quá hạn cho các sách đang mượn';

    public function handle()
    {
        $today = CarbonImmutable::today(FineCalculationService::BUSINESS_TIMEZONE);
        $calculator = app(FineCalculationService::class);

        $overdueLoans = Borrowing::where('status', Borrowing::STATUS_BORROWED)
            ->whereNotNull('due_date')
            ->where('due_date', '<', $today->toDateString())
            ->get();

        $count = 0;
        $totalAmount = 0;

        foreach ($overdueLoans as $loan) {
            DB::transaction(function () use ($loan, $calculator, $today, &$count, &$totalAmount) {
                $calculation = $calculator->calculate($loan, $today);
                $fine = $calculator->syncOverdueFine($loan, $today);

                if ($fine && $fine->status === Fine::STATUS_UNPAID) {
                    $count++;
                    $totalAmount += $calculation['amount'];
                }
            });
        }

        $this->info("Đã cập nhật tiền phạt cho {$count} phiếu mượn trễ hạn với tổng số tiền " . number_format($totalAmount) . " VND.");
    }
}
