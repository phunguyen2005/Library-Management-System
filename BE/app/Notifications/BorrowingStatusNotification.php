<?php

namespace App\Notifications;

use App\Models\Borrowing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class BorrowingStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $borrowing;
    public $statusType;
    public $reason;

    public function __construct(Borrowing $borrowing, string $statusType, ?string $reason = null)
    {
        $this->borrowing = $borrowing;
        $this->statusType = $statusType; // 'approved', 'rejected', 'returned'
        $this->reason = $reason;
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $message = '';
        if ($this->statusType === 'approved') {
            $message = 'Yêu cầu mượn sách "' . $this->borrowing->book->title . '" đã được duyệt.';
        } elseif ($this->statusType === 'rejected') {
            $message = 'Yêu cầu mượn sách "' . $this->borrowing->book->title . '" đã bị từ chối.';
            if ($this->reason) {
                $message .= ' Lý do: ' . $this->reason;
            }
        } elseif ($this->statusType === 'returned') {
            $message = 'Bạn đã trả sách "' . $this->borrowing->book->title . '" thành công. Hãy để lại đánh giá để tích lũy ngay 30 XP & 10 Điểm nhé! 🌟';
        }

        return [
            'type' => 'borrowing_status',
            'borrowing_id' => $this->borrowing->borrowing_id,
            'book_title' => $this->borrowing->book->title,
            'status_type' => $this->statusType,
            'message' => $message,
        ];
    }
}
