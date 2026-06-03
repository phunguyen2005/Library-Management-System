<?php

namespace App\Mail;

use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\App;

class ChangePasswordOTP extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;
    private string $mailLocale;

    /**
     * Create a new message instance.
     */
    public function __construct(string $otp, ?string $mailLocale = null)
    {
        $this->otp = $otp;
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
            fn () => new Envelope(subject: __('messages.mail.otp.change_password.subject'))
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.change-password-otp',
            with: ['copy' => $this->copy()],
        );
    }

    private function copy(): array
    {
        return LocalizedContent::withLocale($this->mailLocale, fn () => [
            'title' => __('messages.mail.otp.change_password.title'),
            'heading' => __('messages.mail.otp.change_password.heading'),
            'intro' => __('messages.mail.otp.change_password.intro'),
            'instruction' => __('messages.mail.otp.change_password.instruction'),
            'validity' => __('messages.mail.otp.change_password.validity'),
            'footer_notice' => __('messages.mail.otp.change_password.footer_notice'),
            'salutation' => __('messages.mail.common.salutation'),
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
