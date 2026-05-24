<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\ReadingProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReadingProgressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $member = $request->user();

        $items = ReadingProgress::query()
            ->with('book')
            ->where('member_id', $member->member_id)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (ReadingProgress $progress) => $this->serializeProgress($progress));

        return response()->json($items);
    }

    public function show(Request $request, Book $book): JsonResponse
    {
        $member = $request->user();

        $progress = ReadingProgress::query()
            ->with('book')
            ->where('member_id', $member->member_id)
            ->where('book_id', $book->book_id)
            ->first();

        if (! $progress) {
            return response()->json([
                'progress' => null,
            ]);
        }

        return response()->json([
            'progress' => $this->serializeProgress($progress),
        ]);
    }

    public function update(Request $request, Book $book): JsonResponse
    {
        if (! $book->is_digital) {
            return response()->json([
                'message' => 'Reading progress can only be saved for digital resources.',
            ], 422);
        }

        $validated = $request->validate([
            'current_page' => ['required', 'integer', 'min:1'],
            'total_pages' => ['required', 'integer', 'min:1', 'max:100000'],
        ]);

        $currentPage = min((int) $validated['current_page'], (int) $validated['total_pages']);
        $member = $request->user();

        $progress = ReadingProgress::query()->updateOrCreate(
            [
                'member_id' => $member->member_id,
                'book_id' => $book->book_id,
            ],
            [
                'current_page' => $currentPage,
                'total_pages' => (int) $validated['total_pages'],
                'last_read_at' => now(),
            ],
        );

        $progress->load('book');

        return response()->json([
            'message' => 'Reading progress synced successfully.',
            'progress' => $this->serializeProgress($progress),
        ]);
    }

    private function serializeProgress(ReadingProgress $progress): array
    {
        return [
            'progress_id' => $progress->progress_id,
            'book_id' => $progress->book_id,
            'member_id' => $progress->member_id,
            'current_page' => $progress->current_page,
            'total_pages' => $progress->total_pages,
            'progress_percent' => $progress->progressPercent(),
            'last_read_at' => $progress->last_read_at?->toISOString(),
            'updated_at' => $progress->updated_at?->toISOString(),
            'book' => $progress->book ? [
                'book_id' => $progress->book->book_id,
                'title' => $progress->book->title,
                'author' => $progress->book->author,
                'cover' => $progress->book->cover,
                'file_format' => $progress->book->file_format,
            ] : null,
        ];
    }
}
