<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberReward extends Model
{
    use HasFactory;

    protected $table = 'member_rewards';

    public $timestamps = false;

    protected $fillable = [
        'member_id',
        'reward_id',
        'status',
        'redeemed_at',
        'expires_at',
        'used_at',
    ];

    protected $casts = [
        'redeemed_at' => 'datetime',
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id', 'member_id');
    }

    public function reward(): BelongsTo
    {
        return $this->belongsTo(Reward::class, 'reward_id', 'id');
    }
}
