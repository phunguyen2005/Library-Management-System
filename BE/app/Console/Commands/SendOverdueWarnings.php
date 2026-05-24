<?php

namespace App\Console\Commands;

use App\Models\Borrowing;
use App\Notifications\OverdueNotification;
use Illuminate\Console\Command;

class SendOverdueWarnings extends Command
{
    protected $signature = 'app:send-overdue-warnings';
    protected $description = 'Send email and database notifications for overdue books';

    public function handle()
    {
        $borrowings = Borrowing::query()
            ->with(['member', 'book'])
            ->where('status', Borrowing::STATUS_BORROWED)
            ->where('due_date', '<', now()->toDateString())
            ->get();

        $count = 0;
        foreach ($borrowings as $borrowing) {
            // Notify member
            $borrowing->member->notify(new OverdueNotification($borrowing));
            $borrowing->member->notify(new \App\Notifications\OverdueMailNotification($borrowing));
            $count++;
        }

        $this->info("Sent {$count} overdue warnings.");
    }
}
