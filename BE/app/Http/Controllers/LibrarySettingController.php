<?php

namespace App\Http\Controllers;

use App\Http\Requests\LibrarySettingUpdateRequest;
use App\Models\LibrarySetting;

class LibrarySettingController extends Controller
{
    public function show()
    {
        $settings = LibrarySetting::singleton();

        return response()->json($this->formatResponse($settings));
    }

    public function update(LibrarySettingUpdateRequest $request)
    {
        $validated = $request->validated();
        $settings = LibrarySetting::singleton();

        $settings->fill([
            'loan_period_days' => $validated['loan_period_days'],
            'max_active_loans' => $validated['max_active_loans'],
            'fine_per_day' => $validated['fine_per_day'],
            'max_fine_per_loan' => $validated['max_fine_per_loan'],
            'grace_period_days' => $validated['grace_period_days'],
            'room_max_hours_per_booking' => $validated['room_max_hours_per_booking'],
            'room_max_bookings_per_day' => $validated['room_max_bookings_per_day'],
            'room_advance_booking_days' => $validated['room_advance_booking_days'],
            'room_min_group_size' => $validated['room_min_group_size'],
            'room_checkin_window_minutes' => $validated['room_checkin_window_minutes'],
            'room_booking_requires_approval' => $validated['room_booking_requires_approval'],
            'room_open_time' => $validated['room_open_time'],
            'room_close_time' => $validated['room_close_time'],
            'room_cancel_deadline_hours' => $validated['room_cancel_deadline_hours'],
        ]);
        $settings->save();

        \App\Services\AuditLoggerService::log(
            'settings_update', 
            'Đã cập nhật cấu hình hệ thống: Hạn mượn ' . $validated['loan_period_days'] . ' ngày, Giới hạn đặt phòng ' . $validated['room_max_hours_per_booking'] . 'h/lần, ' . ($validated['room_booking_requires_approval'] ? 'Yêu cầu duyệt đặt phòng' : 'Tự động duyệt đặt phòng')
        );

        return response()->json($this->formatResponse($settings));
    }

    private function formatResponse(LibrarySetting $settings): array
    {
        return [
            'loan_period_days' => (int) $settings->loan_period_days,
            'max_active_loans' => (int) $settings->max_active_loans,
            'fine_per_day' => (float) ($settings->fine_per_day ?? LibrarySetting::DEFAULT_FINE_PER_DAY),
            'max_fine_per_loan' => (float) ($settings->max_fine_per_loan ?? LibrarySetting::DEFAULT_MAX_FINE_PER_LOAN),
            'grace_period_days' => (int) ($settings->grace_period_days ?? LibrarySetting::DEFAULT_GRACE_PERIOD_DAYS),
            'room_max_hours_per_booking' => (int) ($settings->room_max_hours_per_booking ?? LibrarySetting::DEFAULT_ROOM_MAX_HOURS_PER_BOOKING),
            'room_max_bookings_per_day' => (int) ($settings->room_max_bookings_per_day ?? LibrarySetting::DEFAULT_ROOM_MAX_BOOKINGS_PER_DAY),
            'room_advance_booking_days' => (int) ($settings->room_advance_booking_days ?? LibrarySetting::DEFAULT_ROOM_ADVANCE_BOOKING_DAYS),
            'room_min_group_size' => (int) ($settings->room_min_group_size ?? LibrarySetting::DEFAULT_ROOM_MIN_GROUP_SIZE),
            'room_checkin_window_minutes' => (int) ($settings->room_checkin_window_minutes ?? LibrarySetting::DEFAULT_ROOM_CHECKIN_WINDOW_MINUTES),
            'room_booking_requires_approval' => (bool) ($settings->room_booking_requires_approval ?? LibrarySetting::DEFAULT_ROOM_BOOKING_REQUIRES_APPROVAL),
            'room_open_time' => (string) ($settings->room_open_time ?? LibrarySetting::DEFAULT_ROOM_OPEN_TIME),
            'room_close_time' => (string) ($settings->room_close_time ?? LibrarySetting::DEFAULT_ROOM_CLOSE_TIME),
            'room_cancel_deadline_hours' => (int) ($settings->room_cancel_deadline_hours ?? LibrarySetting::DEFAULT_ROOM_CANCEL_DEADLINE_HOURS),
            'updated_at' => $settings->updated_at?->toIso8601String(),
        ];
    }
}
