<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class GamifyNotification extends Notification
{
    use Queueable;

    protected string $title;
    protected string $message;
    protected string $gamifyType; // level_up, badge_earned, reward_redeemed
    protected array $payload;

    public function __construct(string $title, string $message, string $gamifyType, array $payload = [])
    {
        $this->title = $title;
        $this->message = $message;
        $this->gamifyType = $gamifyType;
        $this->payload = $payload;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return array_merge([
            'type' => 'gamification',
            'gamify_type' => $this->gamifyType,
            'title' => $this->title,
            'message' => $this->message,
        ], $this->payload);
    }
}
