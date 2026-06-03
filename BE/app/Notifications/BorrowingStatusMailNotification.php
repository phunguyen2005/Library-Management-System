<?php

namespace App\Notifications;

use App\Models\Borrowing;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;
use Illuminate\Support\HtmlString;

class BorrowingStatusMailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $borrowing;
    public $statusType;
    public $reason;
    public $isReservation;
    private string $notificationLocale;

    public function __construct(
        Borrowing $borrowing,
        string $statusType,
        ?string $reason = null,
        bool $isReservation = false,
        ?string $notificationLocale = null
    )
    {
        $this->borrowing = $borrowing;
        $this->statusType = $statusType;
        $this->reason = $reason;
        $this->isReservation = $isReservation;
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
        return LocalizedContent::withLocale($this->notificationLocale, fn () => $this->buildMail());
    }

    private function buildMail(): MailMessage
    {
        $message = new MailMessage();
        $memberName = $this->borrowing->member->name ?? __('messages.mail.common.recipient_fallback');
        $bookTitle = $this->borrowing->book->title;

        $message->salutation(__('messages.mail.common.salutation'));

        if ($this->statusType === 'approved') {
            $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={$this->borrowing->loan_id}";
            $qrAlt = e(__('messages.mail.borrowing.qr_alt'));
            
            if ($this->isReservation) {
                $message->subject(__('messages.mail.borrowing.reservation_ready_subject'))
                    ->greeting(__('messages.mail.common.greeting', ['name' => $memberName]))
                    ->line(__('messages.mail.borrowing.reservation_ready_line', ['book_title' => $bookTitle]))
                    ->line(__('messages.mail.borrowing.reservation_auto_approved'))
                    ->line(__('messages.mail.borrowing.pickup_instruction'))
                    ->line(new HtmlString('<div style="text-align: center; margin: 20px 0;"><img src="'.$qrUrl.'" alt="'.$qrAlt.'" style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;" /></div>'))
                    ->action(__('messages.mail.borrowing.transaction_action'), config('app.frontend_url', 'http://localhost:3000').'/history');
            } else {
                $message->subject(__('messages.mail.borrowing.approved_subject'))
                    ->greeting(__('messages.mail.common.greeting', ['name' => $memberName]))
                    ->line(__('messages.mail.borrowing.approved_line', ['book_title' => $bookTitle]))
                    ->line(__('messages.mail.borrowing.pickup_instruction'))
                    ->line(new HtmlString('<div style="text-align: center; margin: 20px 0;"><img src="'.$qrUrl.'" alt="'.$qrAlt.'" style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;" /></div>'))
                    ->action(__('messages.mail.borrowing.transaction_action'), config('app.frontend_url', 'http://localhost:3000').'/history');
            }
        } elseif ($this->statusType === 'rejected') {
            $message->subject(__('messages.mail.borrowing.rejected_subject'))
                ->greeting(__('messages.mail.common.greeting', ['name' => $memberName]))
                ->line(__('messages.mail.borrowing.rejected_line', ['book_title' => $bookTitle]));
            if ($this->reason) {
                $message->line(__('messages.mail.borrowing.rejection_reason', ['reason' => $this->reason]));
            }
            $message->line(__('messages.mail.borrowing.support_line'))
                ->action(__('messages.mail.borrowing.transaction_action'), config('app.frontend_url', 'http://localhost:3000').'/history');
        } elseif ($this->statusType === 'returned') {
            $reviewUrl = config('app.frontend_url', 'http://localhost:3000').'/catalog?book='.$this->borrowing->book_id;
            $message->subject(__('messages.mail.borrowing.returned_subject', ['book_title' => $bookTitle]))
                    ->view('emails.returned_book_review', [
                        'memberName' => $memberName,
                        'bookTitle' => $bookTitle,
                        'reviewUrl' => $reviewUrl,
                        'copy' => $this->returnedReviewCopy($memberName, $bookTitle),
                    ]);
        } elseif ($this->statusType === 'expired') {
            $message->subject(__('messages.mail.borrowing.expired_subject'))
                ->greeting(__('messages.mail.common.greeting', ['name' => $memberName]))
                ->line(__('messages.mail.borrowing.expired_line', [
                    'book_title' => $bookTitle,
                    'loan_id' => $this->borrowing->loan_id,
                ]))
                ->line(__('messages.mail.borrowing.expired_instruction'))
                ->action(__('messages.mail.borrowing.history_action'), config('app.frontend_url', 'http://localhost:3000').'/history');
        }

        return $message;
    }

    private function returnedReviewCopy(string $memberName, string $bookTitle): array
    {
        return [
            'title' => __('messages.mail.returned_review.title'),
            'header_brand' => __('messages.mail.returned_review.header_brand'),
            'header_subtitle' => __('messages.mail.returned_review.header_subtitle'),
            'greeting' => __('messages.mail.returned_review.greeting', ['name' => $memberName]),
            'intro' => __('messages.mail.returned_review.intro', ['book_title' => $bookTitle]),
            'card_title' => __('messages.mail.returned_review.card_title'),
            'card_body' => __('messages.mail.returned_review.card_body'),
            'xp_label' => __('messages.mail.returned_review.xp_label'),
            'points_label' => __('messages.mail.returned_review.points_label'),
            'action' => __('messages.mail.returned_review.action'),
            'helper' => __('messages.mail.returned_review.helper'),
            'full_library' => __('messages.mail.common.full_library'),
            'support_line' => __('messages.mail.common.support_line'),
        ];
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
