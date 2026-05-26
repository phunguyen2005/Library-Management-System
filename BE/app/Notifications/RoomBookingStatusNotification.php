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
        $message = new MailMessage();
        $roomName = $this->booking->room?->name ?? 'Phòng';
        $dateStr = $this->booking->date ? $this->booking->date->format('d/m/Y') : '';
        $timeStr = substr($this->booking->start_time, 0, 5) . ' - ' . substr($this->booking->end_time, 0, 5);
        $studentName = $notifiable->name ?? 'Bạn';

        $message->salutation("Trân trọng,\nThư viện số HCMUE");

        if ($this->statusType === 'approved') {
            $message->subject('[Thư viện số HCMUE] Phê duyệt yêu cầu đặt phòng tự học')
                    ->greeting("Kính chào $studentName,")
                    ->line("Yêu cầu đặt phòng tự học của bạn đã được phê duyệt thành công.")
                    ->line("Thông tin phòng đặt:")
                    ->line("- Phòng học: $roomName")
                    ->line("- Ngày đặt: $dateStr")
                    ->line("- Khung giờ: $timeStr")
                    ->line("- Mã nhận phòng: {$this->booking->booking_code}")
                    ->line("Vui lòng đến đúng giờ và thực hiện quét mã check-in tại phòng để bắt đầu sử dụng.")
                    ->action('Xem lịch sử đặt phòng', config('app.frontend_url', 'http://localhost:3000') . '/room-bookings');
        } elseif ($this->statusType === 'rejected') {
            $message->subject('[Thư viện số HCMUE] Từ chối yêu cầu đặt phòng tự học')
                    ->greeting("Kính chào $studentName,")
                    ->line("Yêu cầu đặt phòng tự học của bạn không được phê duyệt.")
                    ->line("Thông tin chi tiết:")
                    ->line("- Phòng: $roomName vào ngày $dateStr ($timeStr)");
            if ($this->reason) {
                $message->line("- Lý do từ chối: {$this->reason}");
            }
            $message->action('Đặt phòng khác', config('app.frontend_url', 'http://localhost:3000') . '/rooms');
        } elseif ($this->statusType === 'cancelled') {
            $message->subject('[Thư viện số HCMUE] Xác nhận hủy đặt phòng tự học')
                    ->greeting("Kính chào $studentName,")
                    ->line("Lịch đặt phòng tự học của bạn đã được hủy thành công.")
                    ->line("Thông tin phòng đã hủy:")
                    ->line("- Phòng: $roomName")
                    ->line("- Thời gian: ngày $dateStr ($timeStr)")
                    ->action('Đặt phòng khác', config('app.frontend_url', 'http://localhost:3000') . '/rooms');
        } elseif ($this->statusType === 'no_show') {
            $message->subject('[Thư viện số HCMUE] Cảnh báo: Vắng mặt lịch đặt phòng tự học')
                    ->greeting("Kính chào $studentName,")
                    ->line("Hệ thống ghi nhận bạn đã không đến check-in nhận phòng tự học đúng giờ quy định.")
                    ->line("Chi tiết lịch đặt:")
                    ->line("- Phòng: $roomName vào ngày $dateStr ($timeStr)")
                    ->line("Lịch đặt của bạn đã bị hủy tự động do quá giờ check-in. Vui lòng lưu ý tuân thủ đúng thời gian quy định trong các lần đặt tiếp theo.");
            if ($this->reason) {
                $message->line("- Lý do: {$this->reason}");
            }
            $message->action('Xem lịch sử đặt phòng', config('app.frontend_url', 'http://localhost:3000') . '/room-bookings');
        }

        return $message;
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
