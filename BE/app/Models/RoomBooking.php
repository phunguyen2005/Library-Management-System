<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class RoomBooking extends Model
{
    protected $table = 'room_bookings';
    protected $primaryKey = 'booking_id';

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_NO_SHOW = 'no_show';

    protected $fillable = [
        'room_id',
        'member_id',
        'date',
        'start_time',
        'end_time',
        'purpose',
        'group_size',
        'status',
        'rejection_reason',
        'approved_by',
        'check_in_at',
        'check_out_at',
        'booking_code',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'check_in_at' => 'datetime',
            'check_out_at' => 'datetime',
            'group_size' => 'integer',
        ];
    }

    /**
     * Generate a unique 6-character booking code.
     */
    public static function generateBookingCode(): string
    {
        do {
            $code = strtoupper(Str::random(6));
        } while (self::where('booking_code', $code)->exists());

        return $code;
    }

    /**
     * Check if there is an overlapping approved/pending booking for the room.
     */
    public static function hasConflict(int $roomId, string $date, string $startTime, string $endTime, ?int $excludeId = null): bool
    {
        $query = self::where('room_id', $roomId)
            ->where('date', $date)
            ->whereIn('status', [self::STATUS_APPROVED, self::STATUS_PENDING])
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime);

        if ($excludeId) {
            $query->where('booking_id', '!=', $excludeId);
        }

        return $query->exists();
    }

    /**
     * Relation to Room.
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'room_id', 'room_id');
    }

    /**
     * Relation to Member (Student).
     */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id', 'member_id');
    }

    /**
     * Relation to Librarian who approved.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(Librarian::class, 'approved_by', 'librarian_id');
    }
}
