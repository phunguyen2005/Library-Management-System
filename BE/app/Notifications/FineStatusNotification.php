<?php

namespace App\Notifications;

use App\Models\Fine;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class FineStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly Fine $fine,
        private readonly string $statusType
    ) {
    }

    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];
        if ($notifiable instanceof \App\Models\Member && $notifiable->notify_fine_status) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $bookTitle = $this->fine->borrowing?->book?->title ?? 'Tài liệu';
        $amount = number_format((float) $this->fine->amount).' VND';
        $studentName = $notifiable->name ?? 'Bạn';
        $reason = $this->fine->reason === 'overdue' ? 'Trả sách quá hạn' : 'Hư hỏng/Mất sách';

        $message = new MailMessage();

        if ($this->statusType === 'paid') {
            $message->subject('[Thư viện số HCMUE] Xác nhận thanh toán khoản phạt');
        } elseif ($this->statusType === 'waived') {
            $message->subject('[Thư viện số HCMUE] Thông báo miễn giảm khoản phạt');
        } else {
            $message->subject('[Thư viện số HCMUE] Thông báo khoản phạt mới phát sinh');
        }

        return $message->view('emails.fine_status', [
            'memberName' => $studentName,
            'bookTitle' => $bookTitle,
            'amount' => $amount,
            'statusType' => $this->statusType,
            'reason' => $reason,
            'actionUrl' => config('app.frontend_url', 'http://localhost:3000') . '/history'
        ]);
    }

    public function toArray(object $notifiable): array
    {
        $bookTitle = $this->fine->borrowing?->book?->title ?? 'Tài liệu';
        $amount = number_format((float) $this->fine->amount).' VND';

        if ($this->statusType === 'paid') {
            $message = "Đã xác nhận thanh toán phạt {$amount} cho sách \"{$bookTitle}\".";
        } elseif ($this->statusType === 'waived') {
            $message = "Khoản phạt {$amount} cho sách \"{$bookTitle}\" đã được miễn.";
        } else {
            $message = "Bạn có khoản phạt mới phát sinh {$amount} cho sách \"{$bookTitle}\".";
        }

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
