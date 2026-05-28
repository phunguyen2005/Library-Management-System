<?php

namespace App\Http\Controllers;

use App\Http\Resources\BookResource;
use App\Models\Book;
use App\Models\Favorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $paginator = $request->user()
            ->favoriteBooks()
            ->withCount([
                'favoritedBy as favorite_count',
                'digitalDownloads as digital_downloads_count',
                'reviews as reviews_count',
            ])
            ->withAvg('reviews', 'rating')
            ->orderByDesc('favorites.created_at')
            ->paginate($validated['per_page'] ?? 15);

        $books = $paginator->getCollection()
            ->each(fn (Book $book) => $book->setAttribute('is_favorite', true));

        return response()->json([
            'data' => BookResource::collection($books)->resolve($request),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(Request $request, Book $book): JsonResponse
    {
        $favorite = Favorite::query()->firstOrCreate([
            'member_id' => $request->user()->member_id,
            'book_id' => $book->book_id,
        ]);

        return response()->json([
            'message' => 'Sách đã được thêm vào danh sách yêu thích.',
            'book' => BookResource::make($this->decorateBook($book, true)),
        ], $favorite->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, Book $book): JsonResponse
    {
        Favorite::query()
            ->where('member_id', $request->user()->member_id)
            ->where('book_id', $book->book_id)
            ->delete();

        return response()->json([
            'message' => 'Sách đã được xóa khỏi danh sách yêu thích.',
            'book' => BookResource::make($this->decorateBook($book, false)),
        ]);
    }

    private function decorateBook(Book $book, bool $isFavorite): Book
    {
        return $book->fresh()
            ->loadCount([
                'favoritedBy as favorite_count',
                'digitalDownloads as digital_downloads_count',
                'reviews as reviews_count',
            ])
            ->loadAvg('reviews', 'rating')
            ->setAttribute('is_favorite', $isFavorite);
    }
}
