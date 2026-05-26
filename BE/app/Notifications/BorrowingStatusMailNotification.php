<?php

namespace App\Notifications;

use App\Models\Borrowing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\HtmlString;
use Illuminate\Notifications\Notification;

class BorrowingStatusMailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $borrowing;
    public $statusType;
    public $reason;
    public $isReservation;

    public function __construct(Borrowing $borrowing, string $statusType, ?string $reason = null, bool $isReservation = false)
    {
        $this->borrowing = $borrowing;
        $this->statusType = $statusType;
        $this->reason = $reason;
        $this->isReservation = $isReservation;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        if ($notifiable instanceof \App\Models\Member) {
            if ($this->isReservation) {
                if (!$notifiable->notify_reservation) {
                    return [];
                }
            } else {
                if (!$notifiable->notify_borrow_status) {
                    return [];
                }
            }
        }
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $message = new MailMessage();
        $memberName = $this->borrowing->member->name ?? 'Bạn';
        $bookTitle = $this->borrowing->book->title;

        $message->salutation("Trân trọng,\nThư viện số HCMUE");

        if ($this->statusType === 'approved') {
            $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={$this->borrowing->loan_id}";
            
            if ($this->isReservation) {
                $message->subject('[Thư viện số HCMUE] Ấn phẩm đặt chỗ trước đã sẵn sàng nhận')
                        ->greeting("Kính chào $memberName,")
                        ->line("Ấn phẩm bạn đăng ký đặt chỗ trước \"$bookTitle\" nay đã có sẵn.")
                        ->line("Hệ thống đã tự động khởi tạo và phê duyệt yêu cầu mượn sách này cho bạn.")
                        ->line('Vui lòng mang theo Thẻ sinh viên hoặc Mã QR dưới đây đến quầy thư viện để nhận sách trong thời gian sớm nhất.')
                        ->line(new HtmlString('<div style="text-align: center; margin: 20px 0;"><img src="'.$qrUrl.'" alt="Mã QR Nhận Sách" style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;" /></div>'))
                        ->action('Xem chi tiết giao dịch', url(config('app.frontend_url', 'http://localhost:3000') . '/history'));
            } else {
                $message->subject('[Thư viện số HCMUE] Phê duyệt yêu cầu mượn sách')
                        ->greeting("Kính chào $memberName,")
                        ->line("Hệ thống thư viện trân trọng thông báo: Yêu cầu mượn ấn phẩm \"$bookTitle\" của bạn đã được phê duyệt.")
                        ->line('Vui lòng mang theo Thẻ sinh viên hoặc Mã QR dưới đây đến quầy thư viện để nhận sách trong thời gian sớm nhất.')
                        ->line(new HtmlString('<div style="text-align: center; margin: 20px 0;"><img src="'.$qrUrl.'" alt="Mã QR Nhận Sách" style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;" /></div>'))
                        ->action('Xem chi tiết giao dịch', url(config('app.frontend_url', 'http://localhost:3000') . '/history'));
            }
        } elseif ($this->statusType === 'rejected') {
            $message->subject('[Thư viện số HCMUE] Từ chối yêu cầu mượn sách')
                    ->greeting("Kính chào $memberName,")
                    ->line("Hệ thống thư viện rất tiếc phải thông báo: Yêu cầu mượn ấn phẩm \"$bookTitle\" của bạn không được phê duyệt.");
            if ($this->reason) {
                $message->line("Lý do từ chối: {$this->reason}");
            }
            $message->line('Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ trực tiếp với bộ phận thư viện để được hỗ trợ.')
                    ->action('Xem chi tiết giao dịch', url(config('app.frontend_url', 'http://localhost:3000') . '/history'));
        } elseif ($this->statusType === 'returned') {
            $message->subject('[Thư viện số HCMUE] Xác nhận hoàn tất trả sách')
                    ->greeting("Kính chào $memberName,")
                    ->line("Hệ thống thư viện xác nhận bạn đã hoàn tất thủ tục trả ấn phẩm \"$bookTitle\".")
                    ->action('Khám phá sách mới', url(config('app.frontend_url', 'http://localhost:3000') . '/catalog'));
        } elseif ($this->statusType === 'expired') {
            $message->subject('[Thư viện số HCMUE] Thông báo hết hạn nhận sách và hủy yêu cầu mượn')
                    ->greeting("Kính chào $memberName,")
                    ->line("Hệ thống thư viện thông báo: Yêu cầu mượn ấn phẩm \"$bookTitle\" (Mã phiếu: #{$this->borrowing->loan_id}) đã bị tự động hủy do quá thời hạn nhận sách quy định.")
                    ->line('Nếu bạn vẫn có nhu cầu mượn ấn phẩm này, vui lòng tạo một yêu cầu mượn mới trên hệ thống.')
                    ->action('Xem lịch sử mượn', url(config('app.frontend_url', 'http://localhost:3000') . '/history'));
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
        return [
            //
        ];
    }
}
