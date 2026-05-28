<?php

namespace App\Jobs;

use App\Models\Book;
use App\Services\BookAiMetadataService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GenerateBookAiMetadataJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public function __construct(public int $bookId)
    {
        $this->onQueue('ai-metadata');
    }

    public function handle(BookAiMetadataService $metadataService): void
    {
        $book = Book::query()->find($this->bookId);

        if (! $book) {
            return;
        }

        if (strtoupper($book->file_format ?: '') === 'AUDIO') {
            return;
        }

        $metadataService->apply($book);
    }
}
