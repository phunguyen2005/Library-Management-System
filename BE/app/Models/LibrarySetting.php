<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LibrarySetting extends Model
{
    public const DEFAULT_LOAN_PERIOD_DAYS = 14;
    public const DEFAULT_MAX_ACTIVE_LOANS = 5;
    public const DEFAULT_FINE_PER_DAY = 5000;
    public const DEFAULT_MAX_FINE_PER_LOAN = 200000;
    public const DEFAULT_GRACE_PERIOD_DAYS = 0;
    public const DEFAULT_DAMAGED_BOOK_FEE = 50000;
    public const DEFAULT_LOST_BOOK_FEE = 200000;
    public const DEFAULT_PICKUP_DEADLINE_HOURS = 48;
    public const DEFAULT_ROOM_MAX_HOURS_PER_BOOKING = 3;
    public const DEFAULT_ROOM_MAX_HOURS_PER_WEEK = 4;
    public const DEFAULT_ROOM_MAX_BOOKINGS_PER_DAY = 2;
    public const DEFAULT_ROOM_ADVANCE_BOOKING_DAYS = 7;
    public const DEFAULT_ROOM_MIN_GROUP_SIZE = 2;
    public const DEFAULT_ROOM_CHECKIN_WINDOW_MINUTES = 15;
    public const DEFAULT_ROOM_BOOKING_REQUIRES_APPROVAL = false;
    public const DEFAULT_ROOM_OPEN_TIME = '07:00';
    public const DEFAULT_ROOM_CLOSE_TIME = '21:00';
    public const DEFAULT_ROOM_CANCEL_DEADLINE_HOURS = 2;

    protected $table = 'library_settings';

    protected static function boot()
    {
        parent::boot();

        static::saved(function () {
            self::clearCache();
        });
    }

    protected $fillable = [
        'loan_period_days',
        'max_active_loans',
        'fine_per_day',
        'max_fine_per_loan',
        'grace_period_days',
        'damaged_book_fee',
        'lost_book_fee',
        'pickup_deadline_hours',
        'room_max_hours_per_booking',
        'room_max_hours_per_week',
        'room_max_bookings_per_day',
        'room_advance_booking_days',
        'room_min_group_size',
        'room_checkin_window_minutes',
        'room_booking_requires_approval',
        'room_open_time',
        'room_close_time',
        'room_cancel_deadline_hours',
    ];

    protected function casts(): array
    {
        return [
            'loan_period_days' => 'integer',
            'max_active_loans' => 'integer',
            'fine_per_day' => 'decimal:2',
            'max_fine_per_loan' => 'decimal:2',
            'grace_period_days' => 'integer',
            'damaged_book_fee' => 'decimal:2',
            'lost_book_fee' => 'decimal:2',
            'pickup_deadline_hours' => 'integer',
            'room_max_hours_per_booking' => 'integer',
            'room_max_hours_per_week' => 'integer',
            'room_max_bookings_per_day' => 'integer',
            'room_advance_booking_days' => 'integer',
            'room_min_group_size' => 'integer',
            'room_checkin_window_minutes' => 'integer',
            'room_booking_requires_approval' => 'boolean',
            'room_open_time' => 'string',
            'room_close_time' => 'string',
            'room_cancel_deadline_hours' => 'integer',
        ];
    }

    public static function clearCache(): void
    {
        if (app()->bound('library_settings.singleton')) {
            app()->forgetInstance('library_settings.singleton');
        }
    }

    public static function singleton(): self
    {
        if (app()->bound('library_settings.singleton')) {
            return app('library_settings.singleton');
        }

        $instance = self::query()->firstOrCreate(
            ['id' => 1],
            [
                'loan_period_days' => self::DEFAULT_LOAN_PERIOD_DAYS,
                'max_active_loans' => self::DEFAULT_MAX_ACTIVE_LOANS,
                'fine_per_day' => self::DEFAULT_FINE_PER_DAY,
                'max_fine_per_loan' => self::DEFAULT_MAX_FINE_PER_LOAN,
                'grace_period_days' => self::DEFAULT_GRACE_PERIOD_DAYS,
                'damaged_book_fee' => self::DEFAULT_DAMAGED_BOOK_FEE,
                'lost_book_fee' => self::DEFAULT_LOST_BOOK_FEE,
                'pickup_deadline_hours' => self::DEFAULT_PICKUP_DEADLINE_HOURS,
                'room_max_hours_per_booking' => self::DEFAULT_ROOM_MAX_HOURS_PER_BOOKING,
                'room_max_hours_per_week' => self::DEFAULT_ROOM_MAX_HOURS_PER_WEEK,
                'room_max_bookings_per_day' => self::DEFAULT_ROOM_MAX_BOOKINGS_PER_DAY,
                'room_advance_booking_days' => self::DEFAULT_ROOM_ADVANCE_BOOKING_DAYS,
                'room_min_group_size' => self::DEFAULT_ROOM_MIN_GROUP_SIZE,
                'room_checkin_window_minutes' => self::DEFAULT_ROOM_CHECKIN_WINDOW_MINUTES,
                'room_booking_requires_approval' => self::DEFAULT_ROOM_BOOKING_REQUIRES_APPROVAL,
                'room_open_time' => self::DEFAULT_ROOM_OPEN_TIME,
                'room_close_time' => self::DEFAULT_ROOM_CLOSE_TIME,
                'room_cancel_deadline_hours' => self::DEFAULT_ROOM_CANCEL_DEADLINE_HOURS,
            ]
        );

        app()->instance('library_settings.singleton', $instance);

        return $instance;
    }
}
