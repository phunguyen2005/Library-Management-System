<?php

namespace App\Notifications;

use App\Support\LocalizedContent;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class MemberSuspendedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $suspensionDays,
        public mixed $suspendedUntil,
        private ?string $notificationLocale = null
    ) {
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
        $messageKey = 'messages.notifications.member_suspended.message';
        $messageParams = [
            'suspended_until' => Carbon::parse($this->suspendedUntil)->format('d/m/Y H:i'),
            'days' => $this->suspensionDays,
        ];

        return [
            'type' => 'member_suspended',
            'message_key' => $messageKey,
            'message_params' => $messageParams,
            'message' => __($messageKey, $messageParams),
            'suspended_until' => $this->suspendedUntil,
        ];
    }
}
