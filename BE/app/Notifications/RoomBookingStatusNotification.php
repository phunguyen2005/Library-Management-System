<?php

namespace App\Notifications;

use App\Models\RoomBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class RoomBookingStatusNotification extends Notification
{
    use Queueable;

    public $booking;
    public $statusType;
    public $reason;

    public function __construct(RoomBooking $booking, string $statusType, ?string $reason = null)
    {
        $this->booking = $booking;
        $this->statusType = $statusType; // 'approved', 'rejected', 'cancelled', 'completed', 'no_show'
        $this->reason = $reason;
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
        $message = '';
        $roomName = $this->booking->room?->name ?? 'Phòng';
        $dateStr = $this->booking->date ? $this->booking->date->format('d/m/Y') : '';
        $timeStr = substr($this->booking->start_time, 0, 5) . ' - ' . substr($this->booking->end_time, 0, 5);

        if ($this->statusType === 'approved') {
            $message = 'Yêu cầu đặt phòng "' . $roomName . '" vào ngày ' . $dateStr . ' (' . $timeStr . ') đã được duyệt.';
        } elseif ($this->statusType === 'rejected') {
            $message = 'Yêu cầu đặt phòng "' . $roomName . '" vào ngày ' . $dateStr . ' (' . $timeStr . ') đã bị từ chối.';
            if ($this->reason) {
                $message .= ' Lý do: ' . $this->reason;
            }
        } elseif ($this->statusType === 'cancelled') {
            $message = 'Đã hủy lịch đặt phòng "' . $roomName . '" vào ngày ' . $dateStr . ' (' . $timeStr . ') thành công.';
        } elseif ($this->statusType === 'completed') {
            $message = 'Lịch sử sử dụng phòng "' . $roomName . '" vào ngày ' . $dateStr . ' (' . $timeStr . ') đã hoàn thành.';
        } elseif ($this->statusType === 'no_show') {
            $message = 'Bạn đã không đến nhận phòng "' . $roomName . '" vào ngày ' . $dateStr . ' (' . $timeStr . ') quá giờ check-in.';
            if ($this->reason) {
                $message .= ' ' . $this->reason;
            }
        }

        return [
            'type' => 'room_booking_status',
            'booking_id' => $this->booking->booking_id,
            'room_name' => $roomName,
            'status_type' => $this->statusType,
            'message' => $message,
        ];
    }
}
