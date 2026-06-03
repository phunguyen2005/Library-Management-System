<?php

namespace App\Notifications;

use App\Models\Fine;
use App\Models\Member;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class FineStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly Fine $fine,
        private readonly string $statusType,
        private ?string $notificationLocale = null
    ) {
        $this->notificationLocale ??= App::getLocale();
    }

    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];

        if ($notifiable instanceof Member && $notifiable->notify_fine_status) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        return LocalizedContent::withLocale($this->notificationLocale, fn () => $this->buildMail($notifiable));
    }

    private function buildMail(object $notifiable): MailMessage
    {
        $message = new MailMessage();
        $bookTitle = $this->bookTitle();
        $amount = $this->formattedAmount();
        $studentName = $notifiable->name ?? __('messages.mail.fine.student_fallback');

        $message->salutation(__('messages.mail.common.salutation'));

        if ($this->statusType === Fine::STATUS_PAID) {
            $message->subject(__('messages.mail.fine.paid.subject'))
                ->greeting(__('messages.mail.common.greeting', ['name' => $studentName]))
                ->line(__('messages.mail.fine.paid.intro'))
                ->line(__('messages.mail.common.details'))
                ->line('- '.__('messages.mail.fine.book', ['book_title' => $bookTitle]))
                ->line('- '.__('messages.mail.fine.amount', ['amount' => $amount]))
                ->line('- '.__('messages.mail.fine.status', ['status' => __('messages.mail.fine.paid.status')]))
                ->action(__('messages.mail.common.account_details'), config('app.frontend_url', 'http://localhost:3000').'/history');
        } elseif ($this->statusType === Fine::STATUS_WAIVED) {
            $message->subject(__('messages.mail.fine.waived.subject'))
                ->greeting(__('messages.mail.common.greeting', ['name' => $studentName]))
                ->line(__('messages.mail.fine.waived.intro'))
                ->line(__('messages.mail.common.details'))
                ->line('- '.__('messages.mail.fine.book', ['book_title' => $bookTitle]))
                ->line('- '.__('messages.mail.fine.amount', ['amount' => $amount]))
                ->line('- '.__('messages.mail.fine.status', ['status' => __('messages.mail.fine.waived.status')]))
                ->action(__('messages.mail.common.account_details'), config('app.frontend_url', 'http://localhost:3000').'/history');
        } else {
            $reason = $this->fine->reason === Fine::REASON_OVERDUE
                ? __('messages.mail.fine.reason_overdue')
                : __('messages.mail.fine.reason_damage');

            $message->subject(__('messages.mail.fine.unpaid.subject'))
                ->greeting(__('messages.mail.common.greeting', ['name' => $studentName]))
                ->line(__('messages.mail.fine.unpaid.intro'))
                ->line(__('messages.mail.common.details'))
                ->line('- '.__('messages.mail.fine.book', ['book_title' => $bookTitle]))
                ->line('- '.__('messages.mail.fine.amount', ['amount' => $amount]))
                ->line('- '.__('messages.mail.fine.unpaid.reason', ['reason' => $reason]))
                ->line(__('messages.mail.fine.unpaid.please_pay'))
                ->action(__('messages.mail.fine.unpaid.action'), config('app.frontend_url', 'http://localhost:3000').'/history');
        }

        return $message;
    }

    public function toArray(object $notifiable): array
    {
        return LocalizedContent::withLocale($this->notificationLocale, fn () => $this->buildArray());
    }

    private function buildArray(): array
    {
        $messageKey = 'messages.notifications.fine.'.$this->statusKey();
        $messageParams = [
            'amount' => $this->formattedAmount(),
            'book_title' => $this->bookTitle(),
        ];

        return [
            'type' => 'fine_status',
            'fine_id' => $this->fine->fine_id,
            'loan_id' => $this->fine->loan_id,
            'book_title' => $this->bookTitle(),
            'status_type' => $this->statusType,
            'amount' => (float) $this->fine->amount,
            'message_key' => $messageKey,
            'message_params' => $messageParams,
            'message' => __($messageKey, $messageParams),
        ];
    }

    private function statusKey(): string
    {
        return match ($this->statusType) {
            Fine::STATUS_PAID => 'paid',
            Fine::STATUS_WAIVED => 'waived',
            default => 'unpaid',
        };
    }

    private function bookTitle(): string
    {
        return $this->fine->borrowing?->book?->title ?? __('messages.mail.fine.book_fallback');
    }

    private function formattedAmount(): string
    {
        return number_format((float) $this->fine->amount).' VND';
    }
}
