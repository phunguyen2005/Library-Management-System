<?php

namespace App\Events;

use App\Models\Borrowing;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BorrowRequestApproved implements ShouldBroadcast
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
            new PrivateChannel('member.' . $this->borrowing->member_id),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->borrowing->loadMissing(['book', 'member']);
        $messageKey = 'messages.events.borrow_request_approved';
        $messageParams = [
            'book_title' => $this->borrowing->book->title ?? 'N/A',
        ];

        return [
            'loan_id' => $this->borrowing->loan_id,
            'book_id' => $this->borrowing->book_id,
            'book_title' => $this->borrowing->book->title ?? 'N/A',
            'status' => $this->borrowing->status,
            'approved_at' => $this->borrowing->approved_at ? $this->borrowing->approved_at->toIso8601String() : now()->toIso8601String(),
            'message_key' => $messageKey,
            'message_params' => $messageParams,
            'message' => __($messageKey, $messageParams),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'borrow.request.approved';
    }
}
