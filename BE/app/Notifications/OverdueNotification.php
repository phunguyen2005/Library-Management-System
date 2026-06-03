<?php

namespace App\Notifications;

use App\Models\Borrowing;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class OverdueNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Borrowing $borrowing, private ?string $notificationLocale = null)
    {
        $this->notificationLocale ??= App::getLocale();
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return LocalizedContent::withLocale($this->notificationLocale, fn () => $this->buildMail());
    }

    private function buildMail(): MailMessage
    {
        return (new MailMessage)
            ->subject(__('messages.mail.overdue.subject'))
            ->line(__('messages.mail.overdue.line_book', ['book_title' => $this->borrowing->book->title]))
            ->line(__('messages.mail.overdue.line_due', ['due_date' => $this->dueDate()]))
            ->line(__('messages.mail.overdue.instruction'))
            ->action(__('messages.mail.overdue.action'), config('app.frontend_url', 'http://localhost:3000').'/history')
            ->salutation(__('messages.mail.common.salutation'));
    }

    public function toArray(object $notifiable): array
    {
        return LocalizedContent::withLocale($this->notificationLocale, fn () => $this->buildArray());
    }

    private function buildArray(): array
    {
        $messageKey = 'messages.notifications.overdue.message';
        $messageParams = [
            'book_title' => $this->borrowing->book->title,
            'due_date' => $this->dueDate(),
        ];

        return [
            'type' => 'overdue',
            'borrowing_id' => $this->borrowing->borrowing_id,
            'book_title' => $this->borrowing->book->title,
            'due_date' => $this->borrowing->due_date->toDateString(),
            'message_key' => $messageKey,
            'message_params' => $messageParams,
            'message' => __($messageKey, $messageParams),
        ];
    }

    private function dueDate(): string
    {
        return $this->borrowing->due_date->format('d/m/Y');
    }
}
