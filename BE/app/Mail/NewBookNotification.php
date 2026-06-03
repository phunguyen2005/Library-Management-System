<?php

namespace App\Mail;

use App\Models\Book;
use App\Models\Member;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\App;

class NewBookNotification extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $book;
    public $member;
    private string $mailLocale;

    /**
     * Create a new message instance.
     */
    public function __construct(Book $book, Member $member, ?string $mailLocale = null)
    {
        $this->book = $book;
        $this->member = $member;
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
            fn () => new Envelope(subject: __('messages.mail.new_book.'.$this->bookType().'_subject', [
                'book_title' => $this->book->title,
            ]))
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.new_book',
            with: ['copy' => $this->copy()],
        );
    }

    private function copy(): array
    {
        $type = $this->bookType();

        return LocalizedContent::withLocale($this->mailLocale, fn () => [
            'title' => __('messages.mail.new_book.'.$type.'_title'),
            'greeting' => __('messages.mail.common.greeting', [
                'name' => $this->member->name ?? __('messages.mail.common.recipient_fallback'),
            ]),
            'intro' => __('messages.mail.new_book.'.$type.'_intro'),
            'name_label' => $type === 'digital'
                ? __('messages.mail.new_book.document_name')
                : __('messages.mail.new_book.book_name'),
            'author' => __('messages.mail.new_book.author'),
            'category' => __('messages.mail.new_book.category'),
            'format' => __('messages.mail.new_book.format'),
            'instruction' => __('messages.mail.new_book.'.$type.'_instruction'),
            'uncategorized' => __('messages.mail.common.uncategorized'),
            'thank_you' => __('messages.mail.common.thank_you'),
            'signature' => __('messages.mail.common.signature'),
        ]);
    }

    private function bookType(): string
    {
        if (strtoupper((string) ($this->book->file_format ?? '')) === 'AUDIO') {
            return 'audio';
        }

        return $this->book->is_digital ? 'digital' : 'physical';
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
