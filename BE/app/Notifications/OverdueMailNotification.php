<?php

namespace App\Notifications;

use App\Models\Borrowing;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class OverdueMailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $borrowing;
    private string $notificationLocale;

    /**
     * Create a new notification instance.
     */
    public function __construct(Borrowing $borrowing, ?string $notificationLocale = null)
    {
        $this->borrowing = $borrowing;
        $this->notificationLocale = $notificationLocale ?? App::getLocale();
        $this->locale($this->notificationLocale);
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
        return LocalizedContent::withLocale($this->notificationLocale, fn () => $this->buildMail());
    }

    private function buildMail(): MailMessage
    {
        $memberName = $this->borrowing->member->name ?? __('messages.mail.common.recipient_fallback');
        $bookTitle = $this->borrowing->book->title;
        $dueDate = $this->borrowing->due_date->format('d/m/Y');

        return (new MailMessage)
            ->subject(__('messages.mail.overdue.urgent.subject'))
            ->greeting(__('messages.mail.common.greeting', ['name' => $memberName]))
            ->line(__('messages.mail.overdue.urgent.intro', ['book_title' => $bookTitle]))
            ->line(__('messages.mail.overdue.urgent.due_line', ['due_date' => $dueDate]))
            ->line(__('messages.mail.overdue.urgent.instruction'))
            ->action(__('messages.mail.borrowing.history_action'), config('app.frontend_url', 'http://localhost:3000').'/history')
            ->line(__('messages.mail.overdue.urgent.ignore_if_returned'))
            ->salutation(__('messages.mail.common.salutation'));
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
