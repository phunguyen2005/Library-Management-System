<?php

namespace App\Notifications;

use App\Models\Book;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class AppNewBookNotification extends Notification
{
    use Queueable;

    public function __construct(public Book $book, private ?string $notificationLocale = null)
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
        $messageKey = 'messages.notifications.new_book.'.$this->bookKind();
        $messageParams = ['book_title' => $this->book->title];

        return [
            'type' => 'new_book',
            'book_id' => $this->book->book_id,
            'book_title' => $this->book->title,
            'message_key' => $messageKey,
            'message_params' => $messageParams,
            'message' => __($messageKey, $messageParams),
        ];
    }

    private function bookKind(): string
    {
        if (strtoupper((string) ($this->book->file_format ?? '')) === 'AUDIO') {
            return 'audio';
        }

        return $this->book->is_digital ? 'digital' : 'physical';
    }
}
