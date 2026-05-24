<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    protected $table = 'rooms';
    protected $primaryKey = 'room_id';

    public const STATUS_ACTIVE = 'active';
    public const STATUS_MAINTENANCE = 'maintenance';
    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'name',
        'capacity',
        'location',
        'amenities',
        'status',
        'is_active',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'amenities' => 'array',
            'is_active' => 'boolean',
            'capacity' => 'integer',
        ];
    }

    /**
     * Scope rooms that are active and not under maintenance/closed.
     */
    public function scopeBookable($query)
    {
        return $query->where('is_active', true)->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Relation to Bookings.
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(RoomBooking::class, 'room_id', 'room_id');
    }
}
