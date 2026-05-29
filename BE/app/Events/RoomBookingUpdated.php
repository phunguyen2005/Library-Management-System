<?php

namespace App\Events;

use App\Models\RoomBooking;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoomBookingUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $booking;

    public function __construct(RoomBooking $booking)
    {
        $this->booking = $booking;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('room-bookings'),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->booking->loadMissing('room');

        return [
            'booking_id' => $this->booking->booking_id,
            'room_id' => $this->booking->room_id,
            'member_id' => $this->booking->member_id,
            'room_name' => $this->booking->room->name ?? 'N/A',
            'date' => $this->booking->date instanceof \DateTimeInterface ? $this->booking->date->format('Y-m-d') : $this->booking->date,
            'start_time' => $this->booking->start_time,
            'end_time' => $this->booking->end_time,
            'status' => $this->booking->status,
            'check_in_at' => $this->booking->check_in_at 
                ? ($this->booking->check_in_at instanceof \DateTimeInterface 
                    ? $this->booking->check_in_at->toIso8601String() 
                    : \Carbon\Carbon::parse($this->booking->check_in_at)->toIso8601String())
                : null,
            'check_out_at' => $this->booking->check_out_at 
                ? ($this->booking->check_out_at instanceof \DateTimeInterface 
                    ? $this->booking->check_out_at->toIso8601String() 
                    : \Carbon\Carbon::parse($this->booking->check_out_at)->toIso8601String())
                : null,
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'room.booking.updated';
    }
}
