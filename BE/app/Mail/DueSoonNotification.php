<?php

namespace App\Mail;

use App\Models\Borrowing;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\App;

class DueSoonNotification extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $borrowing;
    private string $mailLocale;

    /**
     * Create a new message instance.
     */
    public function __construct(Borrowing $borrowing, ?string $mailLocale = null)
    {
        $this->borrowing = $borrowing;
        $this->mailLocale = $mailLocale ?? App::getLocale();
        $this->locale($this->mailLocale);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return LocalizedContent::withLocale(
            $this->mailLocale,
            fn () => new Envelope(subject: __('messages.mail.due_soon.subject'))
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.due_soon',
            with: ['copy' => $this->copy()],
        );
    }

    private function copy(): array
    {
        return LocalizedContent::withLocale($this->mailLocale, fn () => [
            'title' => __('messages.mail.due_soon.title'),
            'greeting' => __('messages.mail.common.greeting', [
                'name' => $this->borrowing->member->name ?? __('messages.mail.common.recipient_fallback'),
            ]),
            'intro' => __('messages.mail.due_soon.intro'),
            'loan_code' => __('messages.mail.due_soon.loan_code'),
            'book' => __('messages.mail.due_soon.book'),
            'borrow_date' => __('messages.mail.due_soon.borrow_date'),
            'due_date' => __('messages.mail.due_soon.due_date'),
            'instruction' => __('messages.mail.due_soon.instruction'),
            'extension' => __('messages.mail.due_soon.extension'),
            'thank_you' => __('messages.mail.common.thank_you'),
            'signature' => __('messages.mail.common.signature'),
        ]);
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
