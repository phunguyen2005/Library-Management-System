<?php

namespace App\Notifications;

use App\Models\RoomBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class RoomBookingStatusNotification extends Notification implements ShouldQueue
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
        $channels = ['database'];
        if ($notifiable instanceof \App\Models\Member && $notifiable->notify_room_status) {
            if (in_array($this->statusType, ['approved', 'rejected', 'cancelled', 'no_show'])) {
                $channels[] = 'mail';
            }
        }
        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $roomName = $this->booking->room?->name ?? 'Phòng';
        $dateStr = $this->booking->date ? $this->booking->date->format('d/m/Y') : '';
        $timeStr = substr($this->booking->start_time, 0, 5) . ' - ' . substr($this->booking->end_time, 0, 5);
        $studentName = $notifiable->name ?? 'Bạn';

        $message = new MailMessage();

        if ($this->statusType === 'approved') {
            $message->subject('[Thư viện số HCMUE] Phê duyệt yêu cầu đặt phòng tự học');
        } elseif ($this->statusType === 'rejected') {
            $message->subject('[Thư viện số HCMUE] Từ chối yêu cầu đặt phòng tự học');
        } elseif ($this->statusType === 'cancelled') {
            $message->subject('[Thư viện số HCMUE] Xác nhận hủy đặt phòng tự học');
        } elseif ($this->statusType === 'no_show') {
            $message->subject('[Thư viện số HCMUE] Cảnh báo: Vắng mặt lịch đặt phòng tự học');
        } else {
            $message->subject('[Thư viện số HCMUE] Cập nhật lịch đặt phòng tự học');
        }

        $qrUrl = $this->statusType === 'approved' ? "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={$this->booking->booking_code}" : null;
        
        $actionUrl = in_array($this->statusType, ['approved', 'no_show']) 
            ? config('app.frontend_url', 'http://localhost:3000') . '/room-bookings'
            : config('app.frontend_url', 'http://localhost:3000') . '/rooms';

        return $message->view('emails.room_booking_status', [
            'memberName' => $studentName,
            'roomName' => $roomName,
            'dateStr' => $dateStr,
            'timeStr' => $timeStr,
            'bookingCode' => $this->booking->booking_code,
            'statusType' => $this->statusType,
            'reason' => $this->reason,
            'qrUrl' => $qrUrl,
            'actionUrl' => $actionUrl
        ]);
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
