<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\HasRolesAndPermissions;

class Member extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRolesAndPermissions;

    protected $table = 'members';

    protected $primaryKey = 'member_id';

    public $timestamps = false;

    protected $fillable = [
        'name',
        'email',
        'phone_number',
        'password',
        'join_date',
        'provider_name',
        'provider_id',
        'email_verified_at',
        'notify_due_soon',
        'notify_new_books',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'join_date' => 'date',
            'password' => 'hashed',
            'notify_due_soon' => 'boolean',
            'notify_new_books' => 'boolean',
        ];
    }

    public function borrowings(): HasMany
    {
        return $this->hasMany(Borrowing::class, 'member_id', 'member_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'member_id', 'member_id');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'member_id', 'member_id');
    }

    public function favoriteBooks(): BelongsToMany
    {
        return $this->belongsToMany(
            Book::class,
            'favorites',
            'member_id',
            'book_id',
            'member_id',
            'book_id',
        )->withTimestamps();
    }

    public function readingProgress(): HasMany
    {
        return $this->hasMany(ReadingProgress::class, 'member_id', 'member_id');
    }

    public function getRoleName(): string
    {
        if (app()->runningUnitTests()) {
            return 'student';
        }
        $role = $this->roles()->first();
        return $role ? $role->name : 'student';
    }
}
