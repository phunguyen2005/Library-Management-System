<?php

namespace App\Events;

use App\Models\Reservation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReservationQueueShifted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $reservation;

    public function __construct(Reservation $reservation)
    {
        $this->reservation = $reservation;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('member.' . $this->reservation->member_id),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->reservation->loadMissing(['book']);

        return [
            'reservation_id' => $this->reservation->reservation_id,
            'book_id' => $this->reservation->book_id,
            'book_title' => $this->reservation->book->title ?? 'N/A',
            'position' => $this->reservation->position,
            'status' => $this->reservation->status,
            'message' => 'Vị trí đặt chỗ sách "' . ($this->reservation->book->title ?? 'N/A') . '" của bạn đã được cập nhật thành vị trí số ' . $this->reservation->position . '.',
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'reservation.queue.shifted';
    }
}
