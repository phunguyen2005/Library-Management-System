<?php

namespace App\Console\Commands;

use App\Models\LibrarySetting;
use App\Models\RoomBooking;
use App\Notifications\RoomBookingStatusNotification;
use App\Services\AuditLoggerService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupNoShowRoomBookings extends Command
{
    protected $signature = 'room-bookings:cleanup-no-show';

    protected $description = 'Tự động chuyển trạng thái no-show cho các lượt đặt phòng quá hạn check-in.';

    public function handle(): int
    {
        $settings = LibrarySetting::singleton();
        $windowMinutes = max(1, (int) ($settings->room_checkin_window_minutes ?? LibrarySetting::DEFAULT_ROOM_CHECKIN_WINDOW_MINUTES));
        $today = now()->format('Y-m-d');

        // Fetch all approved room bookings for today or earlier where check-in is null
        $bookings = RoomBooking::query()
            ->where('status', RoomBooking::STATUS_APPROVED)
            ->where('date', '<=', $today)
            ->whereNull('check_in_at')
            ->with(['room', 'member'])
            ->get();

        if ($bookings->isEmpty()) {
            $this->info('Không có lượt đặt phòng nào cần xử lý no-show.');
            return Command::SUCCESS;
        }

        $count = 0;

        foreach ($bookings as $booking) {
            $bookingDateStr = $booking->date instanceof \DateTimeInterface 
                ? $booking->date->format('Y-m-d') 
                : $booking->date;
            $startDateTime = Carbon::parse($bookingDateStr . ' ' . $booking->start_time);
            $deadline = $startDateTime->copy()->addMinutes($windowMinutes);

            if (now()->greaterThan($deadline)) {
                DB::transaction(function () use ($booking, $windowMinutes, &$count) {
                    $fresh = RoomBooking::query()->lockForUpdate()->find($booking->booking_id);

                    if (! $fresh || $fresh->status !== RoomBooking::STATUS_APPROVED || ! is_null($fresh->check_in_at)) {
                        return;
                    }

                    $fresh->status = RoomBooking::STATUS_NO_SHOW;
                    $fresh->rejection_reason = "Không check-in quá hạn {$windowMinutes} phút.";
                    $fresh->save();

                    AuditLoggerService::log(
                        'room_booking_no_show',
                        'Tự động đánh dấu no-show: ' . $fresh->room?->name . ' của ' . $fresh->member?->name . ' (Mã: ' . $fresh->booking_code . ')',
                        null
                    );

                    try {
                        $fresh->member?->notify(new RoomBookingStatusNotification($fresh, 'no_show', "Không check-in quá hạn {$windowMinutes} phút."));
                    } catch (\Exception $e) {
                        // Ignore notification failures
                    }

                    $count++;
                });
            }
        }

        $this->info("Đã tự động chuyển {$count} lượt đặt phòng sang no-show.");
        return Command::SUCCESS;
    }
}
