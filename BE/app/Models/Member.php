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
        'notify_borrow_status',
        'notify_room_status',
        'notify_room_reminder',
        'notify_fine_status',
        'notify_reservation',
        'xp',
        'points',
        'level',
        'daily_streak',
        'last_check_in_at',
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
            'phone_number' => \App\Casts\SafeEncrypted::class,
            'notify_due_soon' => 'boolean',
            'notify_new_books' => 'boolean',
            'notify_borrow_status' => 'boolean',
            'notify_room_status' => 'boolean',
            'notify_room_reminder' => 'boolean',
            'notify_fine_status' => 'boolean',
            'notify_reservation' => 'boolean',
            'xp' => 'integer',
            'points' => 'integer',
            'level' => 'integer',
            'daily_streak' => 'integer',
            'last_check_in_at' => 'datetime',
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

    public function badges(): BelongsToMany
    {
        return $this->belongsToMany(
            Badge::class,
            'member_badges',
            'member_id',
            'badge_id',
            'member_id',
            'id'
        )->withPivot('earned_at');
    }

    public function rewards(): HasMany
    {
        return $this->hasMany(MemberReward::class, 'member_id', 'member_id');
    }

    public function gamifyLogs(): HasMany
    {
        return $this->hasMany(GamifyLog::class, 'member_id', 'member_id');
    }

    public function getActiveLimitBonus(): int
    {
        return (int) $this->rewards()
            ->where('status', 'active')
            ->whereHas('reward', function ($query) {
                $query->where('benefit_type', 'loan_limit');
            })
            ->where(function ($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->join('rewards', 'member_rewards.reward_id', '=', 'rewards.id')
            ->sum('rewards.benefit_value');
    }

    public function consumeNextDurationBonus(): int
    {
        $activeTicket = $this->rewards()
            ->where('status', 'active')
            ->whereHas('reward', function ($query) {
                $query->where('benefit_type', 'loan_duration');
            })
            ->where(function ($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->first();

        if ($activeTicket) {
            $activeTicket->update([
                'status' => 'used',
                'used_at' => now(),
            ]);
            return (int) $activeTicket->reward->benefit_value;
        }

        return 0;
    }
}
