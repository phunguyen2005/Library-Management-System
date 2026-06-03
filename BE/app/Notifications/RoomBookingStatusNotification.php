<?php

namespace App\Notifications;

use App\Models\Member;
use App\Models\RoomBooking;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;
use Illuminate\Support\HtmlString;

class RoomBookingStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public RoomBooking $booking,
        public string $statusType,
        public ?string $reason = null,
        private ?string $notificationLocale = null
    ) {
        $this->notificationLocale ??= App::getLocale();
    }

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (
            $notifiable instanceof Member
            && $notifiable->notify_room_status
            && in_array($this->statusType, ['approved', 'rejected', 'cancelled', 'no_show'], true)
        ) {
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
        $message = (new MailMessage())
            ->subject(__('messages.mail.room.'.$this->mailKey().'.subject'))
            ->greeting(__('messages.mail.common.greeting', [
                'name' => $notifiable->name ?? __('messages.mail.fine.student_fallback'),
            ]))
            ->line(__('messages.mail.room.'.$this->mailKey().'.intro'))
            ->line(__('messages.mail.common.details'))
            ->line('- '.__('messages.mail.room.room', ['room_name' => $this->roomName()]))
            ->line('- '.__('messages.mail.room.date', ['date' => $this->dateString()]))
            ->line('- '.__('messages.mail.room.time', ['time' => $this->timeString()]));

        if ($this->statusType === 'approved') {
            $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={$this->booking->booking_code}";
            $message->line('- '.__('messages.mail.room.code', ['code' => $this->booking->booking_code]))
                ->line(new HtmlString('<div style="text-align: center; margin: 20px 0;"><img src="'.$qrUrl.'" alt="QR code" style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;" /></div>'))
                ->line(__('messages.mail.room.approved.instruction'));
        }

        if ($this->reason) {
            $message->line('- '.__('messages.mail.room.reason', ['reason' => $this->reason]));
        }

        return $message
            ->action(
                __('messages.mail.room.'.$this->mailKey().'.action'),
                config('app.frontend_url', 'http://localhost:3000').($this->statusType === 'rejected' || $this->statusType === 'cancelled' ? '/rooms' : '/room-bookings')
            )
            ->salutation(__('messages.mail.common.salutation'));
    }

    public function toArray(object $notifiable): array
    {
        return LocalizedContent::withLocale($this->notificationLocale, fn () => $this->buildArray());
    }

    private function buildArray(): array
    {
        $messageKey = $this->messageKey();
        $messageParams = array_filter([
            'room_name' => $this->roomName(),
            'date' => $this->dateString(),
            'time' => $this->timeString(),
            'reason' => $this->reason,
        ], static fn ($value) => $value !== null && $value !== '');

        return [
            'type' => 'room_booking_status',
            'booking_id' => $this->booking->booking_id,
            'room_name' => $this->roomName(),
            'status_type' => $this->statusType,
            'message_key' => $messageKey,
            'message_params' => $messageParams,
            'message' => __($messageKey, $messageParams),
        ];
    }

    private function messageKey(): string
    {
        if ($this->statusType === 'rejected' && $this->reason) {
            return 'messages.notifications.room.status.rejected_with_reason';
        }

        if ($this->statusType === 'no_show' && $this->reason) {
            return 'messages.notifications.room.status.no_show_with_reason';
        }

        return match ($this->statusType) {
            'approved' => 'messages.notifications.room.status.approved',
            'rejected' => 'messages.notifications.room.status.rejected',
            'cancelled' => 'messages.notifications.room.status.cancelled',
            'completed' => 'messages.notifications.room.status.completed',
            'no_show' => 'messages.notifications.room.status.no_show',
            default => 'messages.notifications.room.status.approved',
        };
    }

    private function mailKey(): string
    {
        return match ($this->statusType) {
            'rejected' => 'rejected',
            'cancelled' => 'cancelled',
            'no_show' => 'no_show',
            default => 'approved',
        };
    }

    private function roomName(): string
    {
        return $this->booking->room?->name ?? __('messages.notifications.room.fallback_room');
    }

    private function dateString(): string
    {
        return $this->booking->date ? $this->booking->date->format('d/m/Y') : '';
    }

    private function timeString(): string
    {
        return substr($this->booking->start_time, 0, 5).' - '.substr($this->booking->end_time, 0, 5);
    }
}
