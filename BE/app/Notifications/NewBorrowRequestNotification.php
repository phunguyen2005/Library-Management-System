<?php

namespace App\Notifications;

use App\Models\Borrowing;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

use Illuminate\Contracts\Queue\ShouldQueue;

class NewBorrowRequestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $borrowing;

    public function __construct(Borrowing $borrowing)
    {
        $this->borrowing = $borrowing;
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'new_borrow_request',
            'borrowing_id' => $this->borrowing->borrowing_id,
            'book_title' => $this->borrowing->book->title,
            'member_name' => $this->borrowing->member->name,
            'message' => 'Sinh viên ' . $this->borrowing->member->name . ' vừa tạo yêu cầu mượn sách "' . $this->borrowing->book->title . '".',
        ];
    }
}
