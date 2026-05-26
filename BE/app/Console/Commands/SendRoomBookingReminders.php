<?php

namespace App\Console\Commands;

use App\Models\RoomBooking;
use App\Notifications\RoomBookingReminderNotification;
use Illuminate\Console\Command;

class SendRoomBookingReminders extends Command
{
    protected $signature = 'app:send-room-booking-reminders';
    protected $description = 'Send email and database reminders for room bookings starting in 30-60 minutes';

    public function handle()
    {
        $now = now();
        $targetDate = $now->toDateString();
        
        // Define window: starting between 30 and 60 minutes from now
        $startWindow = $now->copy()->addMinutes(30)->toTimeString();
        $endWindow = $now->copy()->addMinutes(60)->toTimeString();

        $bookings = RoomBooking::query()
            ->with(['member', 'room'])
            ->where('status', RoomBooking::STATUS_APPROVED)
            ->where('date', $targetDate)
            ->where('start_time', '>=', $startWindow)
            ->where('start_time', '<=', $endWindow)
            ->where('reminder_sent', false)
            ->get();

        $count = 0;
        foreach ($bookings as $booking) {
            $booking->reminder_sent = true;
            $booking->save();

            if ($booking->member) {
                try {
                    $booking->member->notify(new RoomBookingReminderNotification($booking));
                    $count++;
                } catch (\Exception $e) {
                    // Ignore mail failures in tests/local
                }
            }
        }

        $this->info("Sent {$count} room booking reminders.");
        return Command::SUCCESS;
    }
}
