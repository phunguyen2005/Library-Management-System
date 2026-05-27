<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class MemberSuspendedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $suspensionDays;
    public $suspendedUntil;

    public function __construct(int $suspensionDays, $suspendedUntil)
    {
        $this->suspensionDays = $suspensionDays;
        $this->suspendedUntil = $suspendedUntil;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $dateStr = \Carbon\Carbon::parse($this->suspendedUntil)->format('d/m/Y H:i');
        return [
            'type' => 'member_suspended',
            'message' => "Tài khoản của bạn đã bị tạm khóa quyền mượn và đặt chỗ sách đến {$dateStr} ({$this->suspensionDays} ngày) do vi phạm quá hạn nhận sách quá 3 lần trong vòng 2 tuần.",
            'suspended_until' => $this->suspendedUntil,
        ];
    }
}
