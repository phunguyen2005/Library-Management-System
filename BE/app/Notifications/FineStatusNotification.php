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
        $channels = ['database'];
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
        $message = new MailMessage();
        $bookTitle = $this->fine->borrowing?->book?->title ?? 'Tài liệu';
        $amount = number_format((float) $this->fine->amount).' VND';
        $studentName = $notifiable->name ?? 'Bạn';

        $message->salutation("Trân trọng,\nThư viện số HCMUE");

        if ($this->statusType === 'paid') {
            $message->subject('[Thư viện số HCMUE] Xác nhận thanh toán khoản phạt')
                    ->greeting("Kính chào $studentName,")
                    ->line("Hệ thống thư viện xác nhận bạn đã thanh toán thành công khoản phạt.")
                    ->line("Thông tin chi tiết:")
                    ->line("- Tên tài liệu: $bookTitle")
                    ->line("- Số tiền phạt: $amount")
                    ->line("- Trạng thái: Đã thanh toán")
                    ->action('Xem chi tiết tài khoản', config('app.frontend_url', 'http://localhost:3000') . '/history');
        } elseif ($this->statusType === 'waived') {
            $message->subject('[Thư viện số HCMUE] Thông báo miễn giảm khoản phạt')
                    ->greeting("Kính chào $studentName,")
                    ->line("Hệ thống thư viện thông báo: Khoản phạt của bạn đã được miễn giảm bởi thủ thư.")
                    ->line("Thông tin chi tiết:")
                    ->line("- Tên tài liệu: $bookTitle")
                    ->line("- Số tiền phạt: $amount")
                    ->line("- Trạng thái: Đã miễn phạt")
                    ->action('Xem chi tiết tài khoản', config('app.frontend_url', 'http://localhost:3000') . '/history');
        } else {
            $message->subject('[Thư viện số HCMUE] Thông báo khoản phạt mới phát sinh')
                    ->greeting("Kính chào $studentName,")
                    ->line("Hệ thống thư viện thông báo bạn có một khoản phạt mới phát sinh.")
                    ->line("Thông tin chi tiết:")
                    ->line("- Tên tài liệu: $bookTitle")
                    ->line("- Số tiền phạt: $amount")
                    ->line("- Lý do phạt: " . ($this->fine->reason === 'overdue' ? 'Trả sách quá hạn' : 'Hư hỏng/Mất sách'))
                    ->line("Vui lòng thanh toán khoản phạt sớm để tránh ảnh hưởng đến quyền lợi mượn sách tiếp theo.")
                    ->action('Thanh toán khoản phạt', config('app.frontend_url', 'http://localhost:3000') . '/history');
        }

        return $message;
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
