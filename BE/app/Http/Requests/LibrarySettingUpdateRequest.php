<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LibrarySettingUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'loan_period_days' => ['required', 'integer', 'min:1', 'max:365'],
            'max_active_loans' => ['required', 'integer', 'min:1', 'max:50'],
            'fine_per_day' => ['required', 'numeric', 'min:0', 'max:1000000'],
            'max_fine_per_loan' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'grace_period_days' => ['required', 'integer', 'min:0', 'max:30'],
            'room_max_hours_per_booking' => ['required', 'integer', 'min:1', 'max:12'],
            'room_max_hours_per_week' => ['required', 'integer', 'min:1', 'max:168'],
            'room_max_bookings_per_day' => ['required', 'integer', 'min:1', 'max:10'],
            'room_advance_booking_days' => ['required', 'integer', 'min:1', 'max:30'],
            'room_min_group_size' => ['required', 'integer', 'min:1', 'max:20'],
            'room_checkin_window_minutes' => ['required', 'integer', 'min:5', 'max:60'],
            'room_booking_requires_approval' => ['required', 'boolean'],
            'room_open_time' => ['required', 'string', 'regex:/^[0-2][0-9]:[0-5][0-9]$/'],
            'room_close_time' => ['required', 'string', 'regex:/^[0-2][0-9]:[0-5][0-9]$/'],
            'room_cancel_deadline_hours' => ['required', 'integer', 'min:0', 'max:24'],
        ];
    }
}
