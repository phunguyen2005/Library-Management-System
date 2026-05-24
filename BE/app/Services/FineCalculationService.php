<?php

namespace App\Services;

use App\Models\Borrowing;
use App\Models\Fine;
use App\Models\LibrarySetting;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class FineCalculationService
{
    public const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';

    public function calculate(Borrowing $loan, ?CarbonInterface $referenceDate = null): array
    {
        if (! $loan->due_date) {
            return [
                'days_overdue' => 0,
                'amount' => 0.0,
                'fine_per_day' => (float) (LibrarySetting::singleton()->fine_per_day ?? LibrarySetting::DEFAULT_FINE_PER_DAY),
            ];
        }

        $settings = LibrarySetting::singleton();
        $finePerDay = max(0, (float) ($settings->fine_per_day ?? LibrarySetting::DEFAULT_FINE_PER_DAY));
        $maxFine = max(0, (float) ($settings->max_fine_per_loan ?? LibrarySetting::DEFAULT_MAX_FINE_PER_LOAN));
        $graceDays = max(0, (int) ($settings->grace_period_days ?? LibrarySetting::DEFAULT_GRACE_PERIOD_DAYS));

        $dueDate = CarbonImmutable::parse(
            $loan->due_date->toDateString(),
            self::BUSINESS_TIMEZONE
        )->startOfDay();
        $reference = $referenceDate
            ? CarbonImmutable::parse($referenceDate->toDateString(), self::BUSINESS_TIMEZONE)->startOfDay()
            : $this->referenceDateFor($loan);

        $chargeStartDate = $dueDate->addDays($graceDays);
        $daysOverdue = $reference->greaterThan($chargeStartDate)
            ? (int) $chargeStartDate->diffInDays($reference)
            : 0;

        $rawAmount = $daysOverdue * $finePerDay;
        $amount = $maxFine > 0 ? min($rawAmount, $maxFine) : $rawAmount;

        return [
            'days_overdue' => $daysOverdue,
            'amount' => $amount,
            'fine_per_day' => $finePerDay,
        ];
    }

    public function syncOverdueFine(Borrowing $loan, ?CarbonInterface $referenceDate = null): ?Fine
    {
        $calculation = $this->calculate($loan, $referenceDate);

        if ($calculation['amount'] <= 0) {
            return null;
        }

        $fine = Fine::query()
            ->where('loan_id', $loan->loan_id)
            ->lockForUpdate()
            ->first();

        if ($fine && $fine->status !== Fine::STATUS_UNPAID) {
            return $fine;
        }

        $fine ??= new Fine(['loan_id' => $loan->loan_id]);
        $fine->fill([
            'member_id' => $loan->member_id,
            'amount' => $calculation['amount'],
            'reason' => Fine::REASON_OVERDUE,
            'status' => Fine::STATUS_UNPAID,
        ]);
        $fine->save();

        return $fine;
    }

    private function referenceDateFor(Borrowing $loan): CarbonImmutable
    {
        if ($loan->return_date) {
            return CarbonImmutable::parse($loan->return_date->toDateString(), self::BUSINESS_TIMEZONE)->startOfDay();
        }

        return CarbonImmutable::today(self::BUSINESS_TIMEZONE);
    }
}
