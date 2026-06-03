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
            ->view('emails.overdue_warning', [
                'memberName' => $memberName,
                'bookTitle' => $bookTitle,
                'dueDate' => $dueDate,
                'actionUrl' => config('app.frontend_url', 'http://localhost:3000') . '/history'
            ]);
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
