<?php

namespace App\Jobs;

use App\Models\Book;
use App\Models\Member;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class NotifyNewBookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $book;

    /**
     * Create a new job instance.
     */
    public function __construct(Book $book)
    {
        $this->book = $book;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Member::where('notify_new_books', true)->chunk(100, function ($members) {
            foreach ($members as $member) {
                // Lưu vào Database
                $member->notify(new \App\Notifications\AppNewBookNotification($this->book));
            }
        });
    }
}
