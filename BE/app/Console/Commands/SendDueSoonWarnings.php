<?php

namespace App\Console\Commands;

use App\Models\Borrowing;
use App\Mail\DueSoonNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendDueSoonWarnings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:send-due-soon-warnings';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send email warnings for books due in 2 days';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $twoDaysFromNow = now()->addDays(2)->toDateString();

        $borrowings = Borrowing::with(['member', 'book'])
            ->where('status', 'borrowed')
            ->whereDate('due_date', $twoDaysFromNow)
            ->whereHas('member', function ($query) {
                $query->where('notify_due_soon', true);
            })
            ->get();

        $count = 0;
        foreach ($borrowings as $borrowing) {
            // Gửi qua Email
            Mail::to($borrowing->member->email)->send(new DueSoonNotification($borrowing));
            // Lưu vào Database
            $borrowing->member->notify(new \App\Notifications\AppDueSoonNotification($borrowing));
            $count++;
        }

        $this->info("Sent {$count} due soon warnings.");
    }
}
