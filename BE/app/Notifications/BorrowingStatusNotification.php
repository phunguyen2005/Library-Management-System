<?php

namespace App\Notifications;

use App\Models\Borrowing;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class BorrowingStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Borrowing $borrowing,
        public string $statusType,
        public ?string $reason = null,
        private ?string $notificationLocale = null
    ) {
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
        $bookTitle = $this->borrowing->book->title;
        $messageKey = $this->messageKey();
        $messageParams = array_filter([
            'book_title' => $bookTitle,
            'reason' => $this->reason,
        ], static fn ($value) => $value !== null && $value !== '');

        return [
            'type' => 'borrowing_status',
            'borrowing_id' => $this->borrowing->borrowing_id,
            'book_title' => $bookTitle,
            'status_type' => $this->statusType,
            'message_key' => $messageKey,
            'message_params' => $messageParams,
            'message' => __($messageKey, $messageParams),
        ];
    }

    private function messageKey(): string
    {
        if ($this->statusType === Borrowing::STATUS_REJECTED && $this->reason) {
            return 'messages.notifications.borrowing.rejected_with_reason';
        }

        return match ($this->statusType) {
            Borrowing::STATUS_APPROVED => 'messages.notifications.borrowing.approved',
            Borrowing::STATUS_REJECTED => 'messages.notifications.borrowing.rejected',
            Borrowing::STATUS_RETURNED => 'messages.notifications.borrowing.returned',
            default => 'messages.notifications.borrowing.approved',
        };
    }
}
