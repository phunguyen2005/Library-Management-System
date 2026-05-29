<?php

namespace App\Events;

use App\Models\Borrowing;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BorrowRequestCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $borrowing;

    public function __construct(Borrowing $borrowing)
    {
        $this->borrowing = $borrowing;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('librarians'),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        // Force loading relationships
        $this->borrowing->loadMissing(['book', 'member']);

        return [
            'loan_id' => $this->borrowing->loan_id,
            'book_id' => $this->borrowing->book_id,
            'book_title' => $this->borrowing->book->title ?? 'N/A',
            'member_id' => $this->borrowing->member_id,
            'member_name' => $this->borrowing->member->name ?? 'Student',
            'status' => $this->borrowing->status,
            'created_at' => $this->borrowing->created_at ? $this->borrowing->created_at->toIso8601String() : now()->toIso8601String(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'borrow.request.created';
    }
}
