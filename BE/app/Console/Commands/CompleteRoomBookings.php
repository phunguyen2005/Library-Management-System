<?php

namespace App\Console\Commands;

use App\Models\RoomBooking;
use App\Notifications\RoomBookingStatusNotification;
use App\Services\AuditLoggerService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CompleteRoomBookings extends Command
{
    protected $signature = 'room-bookings:complete';

    protected $description = 'Tự động hoàn thành các lượt đặt phòng đã check-in và đã qua giờ kết thúc.';

    public function handle(): int
    {
        $today = now()->format('Y-m-d');

        // Fetch all approved room bookings for today or earlier where check-in is NOT null
        $bookings = RoomBooking::query()
            ->where('status', RoomBooking::STATUS_APPROVED)
            ->where('date', '<=', $today)
            ->whereNotNull('check_in_at')
            ->whereNull('check_out_at')
            ->with(['room', 'member'])
            ->get();

        if ($bookings->isEmpty()) {
            $this->info('Không có lượt đặt phòng nào cần hoàn thành.');
            return Command::SUCCESS;
        }

        $count = 0;

        foreach ($bookings as $booking) {
            $bookingDateStr = $booking->date instanceof \DateTimeInterface 
                ? $booking->date->format('Y-m-d') 
                : $booking->date;
            $endDateTime = Carbon::parse($bookingDateStr . ' ' . $booking->end_time);

            if (now()->greaterThanOrEqualTo($endDateTime)) {
                DB::transaction(function () use ($booking, &$count) {
                    $fresh = RoomBooking::query()->lockForUpdate()->find($booking->booking_id);

                    if (! $fresh || $fresh->status !== RoomBooking::STATUS_APPROVED || is_null($fresh->check_in_at) || ! is_null($fresh->check_out_at)) {
                        return;
                    }

                    $fresh->status = RoomBooking::STATUS_COMPLETED;
                    $fresh->check_out_at = now();
                    $fresh->save();

                    AuditLoggerService::log(
                        'room_booking_complete',
                        'Tự động hoàn thành đặt phòng: ' . $fresh->room?->name . ' của ' . $fresh->member?->name . ' (Mã: ' . $fresh->booking_code . ')',
                        null
                    );

                    try {
                        $fresh->member?->notify(new RoomBookingStatusNotification($fresh, 'completed'));
                    } catch (\Exception $e) {
                        // Ignore notification failures
                    }

                    $count++;
                });
            }
        }

        $this->info("Đã tự động hoàn thành {$count} lượt đặt phòng.");
        return Command::SUCCESS;
    }
}
