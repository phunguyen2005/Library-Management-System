<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GamifyLog extends Model
{
    use HasFactory;

    protected $table = 'gamify_logs';

    public $timestamps = false;

    protected $fillable = [
        'member_id',
        'event_type',
        'xp_gained',
        'points_changed',
        'description',
        'created_at',
    ];

    protected $casts = [
        'xp_gained' => 'integer',
        'points_changed' => 'integer',
        'created_at' => 'datetime',
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id', 'member_id');
    }
}
