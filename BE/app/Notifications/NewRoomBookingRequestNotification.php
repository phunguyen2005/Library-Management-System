<?php

namespace App\Notifications;

use App\Models\RoomBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewRoomBookingRequestNotification extends Notification
{
    use Queueable;

    public $booking;

    public function __construct(RoomBooking $booking)
    {
        $this->booking = $booking;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $roomName = $this->booking->room?->name ?? 'Phòng';
        $studentName = $this->booking->member?->name ?? 'Sinh viên';
        $dateStr = $this->booking->date ? $this->booking->date->format('d/m/Y') : '';
        $timeStr = substr($this->booking->start_time, 0, 5) . ' - ' . substr($this->booking->end_time, 0, 5);

        return [
            'type' => 'new_room_booking_request',
            'booking_id' => $this->booking->booking_id,
            'room_name' => $roomName,
            'student_name' => $studentName,
            'message' => 'Yêu cầu đặt phòng mới từ ' . $studentName . ' cho phòng "' . $roomName . '" vào ngày ' . $dateStr . ' (' . $timeStr . ').',
        ];
    }
}
