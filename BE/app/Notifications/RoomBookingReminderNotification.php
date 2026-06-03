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

class RoomBookingReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public RoomBooking $booking, private ?string $notificationLocale = null)
    {
        $this->notificationLocale ??= App::getLocale();
    }

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($notifiable instanceof Member && $notifiable->notify_room_reminder) {
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
        return (new MailMessage)
            ->subject(__('messages.mail.room.reminder.subject'))
            ->greeting(__('messages.mail.common.greeting', [
                'name' => $notifiable->name ?? __('messages.mail.fine.student_fallback'),
            ]))
            ->line(__('messages.mail.room.reminder.intro'))
            ->line(__('messages.mail.common.details'))
            ->line('- '.__('messages.mail.room.room', ['room_name' => $this->roomName()]))
            ->line('- '.__('messages.mail.room.date', ['date' => $this->dateString()]))
            ->line('- '.__('messages.mail.room.time', ['time' => $this->timeString()]))
            ->line('- '.__('messages.mail.room.code', ['code' => $this->booking->booking_code]))
            ->line(__('messages.mail.room.reminder.instruction'))
            ->action(__('messages.mail.room.reminder.action'), config('app.frontend_url', 'http://localhost:3000').'/room-bookings')
            ->salutation(__('messages.mail.common.salutation'));
    }

    public function toArray(object $notifiable): array
    {
        return LocalizedContent::withLocale($this->notificationLocale, fn () => $this->buildArray());
    }

    private function buildArray(): array
    {
        $messageKey = 'messages.notifications.room.reminder';
        $messageParams = [
            'room_name' => $this->roomName(),
            'date' => $this->dateString(),
            'time' => $this->timeString(),
        ];

        return [
            'type' => 'room_booking_reminder',
            'booking_id' => $this->booking->booking_id,
            'room_name' => $this->roomName(),
            'message_key' => $messageKey,
            'message_params' => $messageParams,
            'message' => __($messageKey, $messageParams),
        ];
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
