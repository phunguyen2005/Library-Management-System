<?php

namespace App\Notifications;

use App\Models\Borrowing;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class AppDueSoonNotification extends Notification
{
    use Queueable;

    public $borrowing;

    public function __construct(Borrowing $borrowing)
    {
        $this->borrowing = $borrowing;
    }

    public function via(object $notifiable): array
    {
        return ['database']; // Email is handled by Mail::to in the Command directly to avoid double sending
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'due_soon',
            'borrowing_id' => $this->borrowing->borrowing_id,
            'book_title' => $this->borrowing->book->title,
            'due_date' => $this->borrowing->due_date->toDateString(),
            'message' => 'Sách "' . $this->borrowing->book->title . '" sắp đến hạn trả vào ngày ' . $this->borrowing->due_date->format('d/m/Y') . '.',
        ];
    }
}
