<?php

namespace App\Notifications;

use App\Models\RoomBooking;
use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class NewRoomBookingRequestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public RoomBooking $booking, private ?string $notificationLocale = null)
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
        $roomName = $this->booking->room?->name ?? __('messages.notifications.room.fallback_room');
        $studentName = $this->booking->member?->name ?? __('messages.notifications.room.fallback_student');
        $dateStr = $this->booking->date ? $this->booking->date->format('d/m/Y') : '';
        $timeStr = substr($this->booking->start_time, 0, 5).' - '.substr($this->booking->end_time, 0, 5);
        $messageKey = 'messages.notifications.room.new_request';
        $messageParams = [
            'student_name' => $studentName,
            'room_name' => $roomName,
            'date' => $dateStr,
            'time' => $timeStr,
        ];

        return [
            'type' => 'new_room_booking_request',
            'booking_id' => $this->booking->booking_id,
            'room_name' => $roomName,
            'student_name' => $studentName,
            'message_key' => $messageKey,
            'message_params' => $messageParams,
            'message' => __($messageKey, $messageParams),
        ];
    }
}
