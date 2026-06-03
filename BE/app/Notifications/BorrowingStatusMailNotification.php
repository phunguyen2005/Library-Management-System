<?php

namespace App\Notifications;

use App\Models\Borrowing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\HtmlString;
use Illuminate\Notifications\Notification;

class BorrowingStatusMailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $borrowing;
    public $statusType;
    public $reason;
    public $isReservation;

    public function __construct(Borrowing $borrowing, string $statusType, ?string $reason = null, bool $isReservation = false)
    {
        $this->borrowing = $borrowing;
        $this->statusType = $statusType;
        $this->reason = $reason;
        $this->isReservation = $isReservation;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        if ($notifiable instanceof \App\Models\Member) {
            if ($this->isReservation) {
                if (!$notifiable->notify_reservation) {
                    return [];
                }
            } else {
                if (!$notifiable->notify_borrow_status) {
                    return [];
                }
            }
        }
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $message = new MailMessage();
        $memberName = $this->borrowing->member->name ?? 'Bạn';
        $bookTitle = $this->borrowing->book->title;

        if ($this->statusType === 'returned') {
            $reviewUrl = config('app.frontend_url', 'http://localhost:3000') . '/catalog?book=' . $this->borrowing->book_id;
            $message->subject('[Thư viện số HCMUE] Bạn vừa trả sách "' . $bookTitle . '" - Chia sẻ cảm nhận & tích lũy điểm thưởng! 📚✨')
                    ->view('emails.returned_book_review', [
                        'memberName' => $memberName,
                        'bookTitle' => $bookTitle,
                        'reviewUrl' => $reviewUrl,
                    ]);
            return $message;
        }

        if ($this->statusType === 'approved') {
            if ($this->isReservation) {
                $message->subject('[Thư viện số HCMUE] Ấn phẩm đặt chỗ trước đã sẵn sàng nhận');
            } else {
                $message->subject('[Thư viện số HCMUE] Phê duyệt yêu cầu mượn sách');
            }
        } elseif ($this->statusType === 'rejected') {
            $message->subject('[Thư viện số HCMUE] Từ chối yêu cầu mượn sách');
        } elseif ($this->statusType === 'expired') {
            $message->subject('[Thư viện số HCMUE] Thông báo hết hạn nhận sách và hủy yêu cầu mượn');
        } else {
            $message->subject('[Thư viện số HCMUE] Cập nhật trạng thái mượn sách');
        }

        $qrUrl = $this->statusType === 'approved' ? "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={$this->borrowing->loan_id}" : null;

        return $message->view('emails.borrowing_status', [
            'memberName' => $memberName,
            'bookTitle' => $bookTitle,
            'statusType' => $this->statusType,
            'isReservation' => $this->isReservation,
            'reason' => $this->reason,
            'qrUrl' => $qrUrl,
            'loanId' => $this->borrowing->loan_id,
            'actionUrl' => config('app.frontend_url', 'http://localhost:3000') . '/history',
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
