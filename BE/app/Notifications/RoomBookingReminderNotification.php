<?php

namespace App\Notifications;

use App\Models\RoomBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RoomBookingReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $booking;

    public function __construct(RoomBooking $booking)
    {
        $this->booking = $booking;
    }

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if ($notifiable instanceof \App\Models\Member && $notifiable->notify_room_reminder) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $roomName = $this->booking->room?->name ?? 'Phòng';
        $dateStr = $this->booking->date ? $this->booking->date->format('d/m/Y') : '';
        $timeStr = substr($this->booking->start_time, 0, 5) . ' - ' . substr($this->booking->end_time, 0, 5);
        $studentName = $notifiable->name ?? 'Bạn';

        return (new MailMessage)
            ->subject('[Thư viện số HCMUE] Nhắc nhở lịch đặt phòng học sắp diễn ra')
            ->greeting("Kính chào $studentName,")
            ->line("Nhắc nhở: Lịch đặt phòng tự học của bạn sẽ bắt đầu trong vòng 30 - 60 phút nữa.")
            ->line("Thông tin phòng học:")
            ->line("- Phòng học: $roomName")
            ->line("- Thời gian: ngày $dateStr từ $timeStr")
            ->line("- Mã nhận phòng: {$this->booking->booking_code}")
            ->line("Vui lòng chuẩn bị và có mặt đúng giờ để thực hiện quét mã check-in nhận phòng.")
            ->action('Xem chi tiết đặt phòng', config('app.frontend_url', 'http://localhost:3000') . '/room-bookings')
            ->salutation("Trân trọng,\nThư viện số HCMUE");
    }

    public function toArray(object $notifiable): array
    {
        $roomName = $this->booking->room?->name ?? 'Phòng';
        $dateStr = $this->booking->date ? $this->booking->date->format('d/m/Y') : '';
        $timeStr = substr($this->booking->start_time, 0, 5) . ' - ' . substr($this->booking->end_time, 0, 5);

        return [
            'type' => 'room_booking_reminder',
            'booking_id' => $this->booking->booking_id,
            'room_name' => $roomName,
            'message' => 'Lịch đặt phòng "' . $roomName . '" vào ngày ' . $dateStr . ' (' . $timeStr . ') sắp bắt đầu.',
        ];
    }
}
