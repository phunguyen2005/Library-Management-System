<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Badge extends Model
{
    use HasFactory;

    protected $table = 'badges';

    protected $fillable = [
        'code',
        'name',
        'description',
        'icon',
        'requirements',
    ];

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(
            Member::class,
            'member_badges',
            'badge_id',
            'member_id',
            'id',
            'member_id'
        )->withPivot('earned_at');
    }
}
