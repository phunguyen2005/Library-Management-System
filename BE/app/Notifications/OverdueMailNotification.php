<?php

namespace App\Notifications;

use App\Models\Borrowing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OverdueMailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $borrowing;

    /**
     * Create a new notification instance.
     */
    public function __construct(Borrowing $borrowing)
    {
        $this->borrowing = $borrowing;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $memberName = $this->borrowing->member->name ?? 'Bạn';
        $bookTitle = $this->borrowing->book->title;
        $dueDate = $this->borrowing->due_date->format('d/m/Y');

        return (new MailMessage)
            ->subject('[Thư viện số HCMUE] CẢNH BÁO QUÁ HẠN: Yêu cầu hoàn trả ấn phẩm khẩn cấp')
            ->greeting("Kính chào $memberName,")
            ->line("Hệ thống thư viện xin thông báo: Ấn phẩm \"$bookTitle\" do bạn mượn đã vượt quá thời hạn hoàn trả quy định.")
            ->line("Hạn trả cuối cùng: $dueDate.")
            ->line('Để tránh làm ảnh hưởng đến hồ sơ mượn sách và phát sinh các khoản phí phạt chậm trả, yêu cầu bạn mang ấn phẩm đến quầy thư viện hoàn trả ngay lập tức.')
            ->action('Xem lịch sử mượn', config('app.frontend_url', 'http://localhost:3000') . '/history')
            ->line('Trường hợp bạn đã trả sách, vui lòng bỏ qua email này hoặc liên hệ thư viện để kiểm tra lại.')
            ->salutation("Trân trọng,\nThư viện số HCMUE");
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}
