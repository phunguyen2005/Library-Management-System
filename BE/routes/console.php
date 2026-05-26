<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('borrowings:calculate-fines')->dailyAt('00:05');
Schedule::command('app:send-due-soon-warnings')->dailyAt('08:00');
Schedule::command('app:send-overdue-warnings')->dailyAt('08:05');
Schedule::command('borrowings:cleanup-approved')->hourly();
Schedule::command('room-bookings:cleanup-no-show')->everyFiveMinutes();
Schedule::command('room-bookings:complete')->everyTenMinutes();
Schedule::command('app:send-room-booking-reminders')->everyMinute();
