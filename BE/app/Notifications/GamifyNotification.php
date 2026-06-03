<?php

namespace App\Notifications;

use App\Support\LocalizedContent;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;

class GamifyNotification extends Notification
{
    use Queueable;

    protected string $title;
    protected string $message;
    protected string $gamifyType; // level_up, badge_earned, reward_redeemed
    protected array $payload;
    protected string $notificationLocale;

    public function __construct(string $title, string $message, string $gamifyType, array $payload = [])
    {
        $this->title = $title;
        $this->message = $message;
        $this->gamifyType = $gamifyType;
        $this->payload = $payload;
        $this->notificationLocale = App::getLocale();
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
        $titleParams = $this->payload['title_params'] ?? [];
        $messageParams = $this->payload['message_params'] ?? [];

        $payload = $this->payload;
        unset($payload['title_params'], $payload['message_params']);

        $data = [
            'type' => 'gamification',
            'gamify_type' => $this->gamifyType,
        ];

        if (Str::startsWith($this->title, 'messages.')) {
            $data['title_key'] = $this->title;
            $data['title_params'] = $titleParams;
            $data['title'] = __($this->title, $titleParams);
        } else {
            $data['title'] = $this->title;
        }

        if (Str::startsWith($this->message, 'messages.')) {
            $data['message_key'] = $this->message;
            $data['message_params'] = $messageParams;
            $data['message'] = __($this->message, $messageParams);
        } else {
            $data['message'] = $this->message;
        }

        return array_merge($data, $payload);
    }
}
