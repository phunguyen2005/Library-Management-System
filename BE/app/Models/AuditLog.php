<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $table = 'audit_logs';
    protected $primaryKey = 'log_id';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'user_type',
        'action',
        'description',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->created_at = $model->created_at ?? now();
        });
    }

    public function user()
    {
        if ($this->user_type === 'student') {
            return $this->belongsTo(Member::class, 'user_id', 'member_id');
        } else {
            return $this->belongsTo(Librarian::class, 'user_id', 'librarian_id');
        }
    }
}
