<?php

namespace App\Notifications;

use App\Models\Book;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class AppNewBookNotification extends Notification
{
    use Queueable;

    public $book;

    public function __construct(Book $book)
    {
        $this->book = $book;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database']; // Email is handled by Mail::to in the Job
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $isAudio = strtoupper((string) ($this->book->file_format ?? '')) === 'AUDIO';
        $isDigital = $this->book->is_digital;

        if ($isAudio) {
            $message = 'Audio book mới "' . $this->book->title . '" vừa được thêm vào kho tài liệu số.';
        } elseif ($isDigital) {
            $message = 'Tài liệu số mới "' . $this->book->title . '" vừa được thêm vào thư viện.';
        } else {
            $message = 'Sách mới "' . $this->book->title . '" vừa được thêm vào thư viện.';
        }

        return [
            'type' => 'new_book',
            'book_id' => $this->book->book_id,
            'book_title' => $this->book->title,
            'message' => $message,
        ];
    }
}
