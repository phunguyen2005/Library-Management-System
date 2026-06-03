<?php

namespace App\Notifications;

use App\Models\Borrowing;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class NewBorrowRequestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Borrowing $borrowing, private ?string $notificationLocale = null)
    {
        $this->notificationLocale ??= App::getLocale();
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return LocalizedContent::withLocale($this->notificationLocale, fn () => $this->buildArray());
    }

    private function buildArray(): array
    {
        $messageKey = 'messages.notifications.borrowing.new_request';
        $messageParams = [
            'student_name' => $this->borrowing->member->name,
            'book_title' => $this->borrowing->book->title,
        ];

        return [
            'type' => 'new_borrow_request',
            'borrowing_id' => $this->borrowing->borrowing_id,
            'book_title' => $this->borrowing->book->title,
            'member_name' => $this->borrowing->member->name,
            'message_key' => $messageKey,
            'message_params' => $messageParams,
            'message' => __($messageKey, $messageParams),
        ];
    }
}
