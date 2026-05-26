<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reward extends Model
{
    use HasFactory;

    protected $table = 'rewards';

    protected $fillable = [
        'code',
        'name',
        'description',
        'points_cost',
        'benefit_type',
        'benefit_value',
        'is_active',
    ];

    protected $casts = [
        'points_cost' => 'integer',
        'benefit_value' => 'integer',
        'is_active' => 'boolean',
    ];

    public function memberRewards(): HasMany
    {
        return $this->hasMany(MemberReward::class, 'reward_id', 'id');
    }
}
