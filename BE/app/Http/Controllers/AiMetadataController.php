<?php

namespace App\Http\Controllers;

use App\Http\Resources\BookResource;
use App\Models\Book;
use App\Services\AuditLoggerService;
use App\Services\BookAiMetadataService;
use App\Services\BookCacheService;
use Illuminate\Http\JsonResponse;

class AiMetadataController extends Controller
{
    public function generate(Book $book, BookAiMetadataService $metadataService, BookCacheService $bookCache): JsonResponse
    {
        $book = $metadataService->apply($book);
        $bookCache->bump();

        AuditLoggerService::log(
            'ai_metadata_generate',
            'Generated AI summary and tags for book ID '.$book->book_id,
        );

        return response()->json([
            'message' => 'AI metadata generated successfully.',
            'book' => new BookResource($book),
        ]);
    }

    public function generateAll(BookAiMetadataService $metadataService, BookCacheService $bookCache): JsonResponse
    {
        $books = Book::all();
        $count = 0;

        foreach ($books as $book) {
            $metadataService->apply($book);
            $count++;
        }

        $bookCache->bump();

        AuditLoggerService::log(
            'ai_metadata_generate_all',
            'Generated AI summary and tags for all '.$count.' books.',
        );

        return response()->json([
            'message' => 'AI metadata generated successfully for all '.$count.' books.',
        ]);
    }
}
