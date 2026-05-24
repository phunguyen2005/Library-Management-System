<?php

namespace App\Notifications;

use App\Models\Fine;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class FineStatusNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Fine $fine,
        private readonly string $statusType
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $bookTitle = $this->fine->borrowing?->book?->title ?? 'Tài liệu';
        $amount = number_format((float) $this->fine->amount).' VND';

        $message = $this->statusType === 'paid'
            ? "Đã xác nhận thanh toán phạt {$amount} cho sách \"{$bookTitle}\"."
            : "Khoản phạt {$amount} cho sách \"{$bookTitle}\" đã được miễn.";

        return [
            'type' => 'fine_status',
            'fine_id' => $this->fine->fine_id,
            'loan_id' => $this->fine->loan_id,
            'book_title' => $bookTitle,
            'status_type' => $this->statusType,
            'amount' => (float) $this->fine->amount,
            'message' => $message,
        ];
    }
}
