<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefreshToken extends Model
{
    use HasFactory;

    protected $table = 'refresh_tokens';

    protected $fillable = [
        'user_id',
        'user_type',
        'token_hash',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];
}
