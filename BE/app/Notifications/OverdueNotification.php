<?php

namespace App\Notifications;

use App\Models\Borrowing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OverdueNotification extends Notification implements ShouldQueue
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
        return ['database', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Cảnh báo: Sách quá hạn trả')
            ->line('Cuốn sách "' . $this->borrowing->book->title . '" mà bạn mượn đã quá hạn trả.')
            ->line('Hạn trả cuối cùng là ngày ' . $this->borrowing->due_date->format('d/m/Y') . '.')
            ->line('Vui lòng đến thư viện trả sách ngay lập tức để tránh các hình phạt theo quy định.')
            ->action('Xem chi tiết', config('app.frontend_url', 'http://localhost:3000') . '/history');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'overdue',
            'borrowing_id' => $this->borrowing->borrowing_id,
            'book_title' => $this->borrowing->book->title,
            'due_date' => $this->borrowing->due_date->toDateString(),
            'message' => 'Sách "' . $this->borrowing->book->title . '" đã QUÁ HẠN trả từ ngày ' . $this->borrowing->due_date->format('d/m/Y') . '.',
        ];
    }
}
