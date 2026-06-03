<?php

namespace App\Notifications;

use App\Models\Borrowing;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class AppDueSoonNotification extends Notification
{
    use Queueable;

    public function __construct(public Borrowing $borrowing, private ?string $notificationLocale = null)
    {
        $this->notificationLocale ??= App::getLocale();
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return LocalizedContent::withLocale($this->notificationLocale, fn () => $this->buildArray());
    }

    private function buildArray(): array
    {
        $messageKey = 'messages.notifications.due_soon.message';
        $messageParams = [
            'book_title' => $this->borrowing->book->title,
            'due_date' => $this->borrowing->due_date->format('d/m/Y'),
        ];

        return [
            'type' => 'due_soon',
            'borrowing_id' => $this->borrowing->borrowing_id,
            'book_title' => $this->borrowing->book->title,
            'due_date' => $this->borrowing->due_date->toDateString(),
            'message_key' => $messageKey,
            'message_params' => $messageParams,
            'message' => __($messageKey, $messageParams),
        ];
    }
}
