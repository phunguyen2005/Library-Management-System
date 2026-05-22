<?php

namespace App\Http\Controllers;

use App\Http\Requests\BookIndexRequest;
use App\Http\Requests\BookUpsertRequest;
use App\Http\Requests\DigitalFileUploadRequest;
use App\Http\Resources\BookResource;
use App\Http\Resources\DigitalDocumentResource;
use App\Models\Book;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BookController extends Controller
{
    public function index(BookIndexRequest $request)
    {
        $validated = $request->validated();
        $query = Book::query()->orderBy('book_id');
        $search = trim((string) ($validated['query'] ?? ''));

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('title', 'like', '%'.$search.'%')
                    ->orWhere('author', 'like', '%'.$search.'%')
                    ->orWhere('genre', 'like', '%'.$search.'%');
            });
        }

        if (array_key_exists('genre', $validated) && $validated['genre'] !== null) {
            $query->where('genre', $validated['genre']);
        }

        if (array_key_exists('is_available', $validated) && $validated['is_available'] !== null) {
            $query->where('is_available', (bool) $validated['is_available']);
        }

        if (array_key_exists('is_digital', $validated) && $validated['is_digital'] !== null) {
            $query->where('is_digital', (bool) $validated['is_digital']);
        }

        if (array_key_exists('resource_type', $validated) && $validated['resource_type'] !== null) {
            $query->where('resource_type', $validated['resource_type']);
        }

        $books = $query->paginate($validated['limit'] ?? 15, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString();

        return BookResource::collection($books);
    }

    public function store(BookUpsertRequest $request)
    {
        $validated = $request->validated();
        $quantity = array_key_exists('quantity', $validated) ? (int) $validated['quantity'] : 1;

        $book = Book::query()->create([
            'title' => $validated['title'],
            'author' => $validated['author'],
            'genre' => $validated['genre'] ?? null,
            'published_year' => $validated['published_year'] ?? null,
            'location' => $validated['location'] ?? null,
            'cover' => $validated['cover'] ?? null,
            'is_digital' => (bool) ($validated['is_digital'] ?? false),
            'resource_type' => $validated['resource_type'] ?? null,
            'file_format' => $validated['file_format'] ?? null,
            'file_size' => $validated['file_size'] ?? null,
            'file_path' => $validated['file_path'] ?? null,
            'file_url' => $validated['file_url'] ?? null,
            'download_count' => (int) ($validated['download_count'] ?? 0),
            'total_quantity' => $quantity,
            'available_quantity' => $quantity,
            'is_available' => $quantity > 0,
        ]);

        return response()->json(new BookResource($book), 201);
    }

    public function update(BookUpsertRequest $request, Book $book)
    {
        $validated = $request->validated();
        $checkedOut = max(0, $book->total_quantity - $book->available_quantity);
        $nextQuantity = array_key_exists('quantity', $validated) ? (int) $validated['quantity'] : $book->total_quantity;

        if ($nextQuantity < $checkedOut) {
            return response()->json([
                'message' => 'Số lượng mới không thể nhỏ hơn số sách đang được mượn.',
            ], 422);
        }

        $book->fill([
            'title' => $validated['title'],
            'author' => $validated['author'],
            'genre' => array_key_exists('genre', $validated) ? $validated['genre'] : $book->genre,
            'published_year' => array_key_exists('published_year', $validated) ? $validated['published_year'] : $book->published_year,
            'location' => array_key_exists('location', $validated) ? $validated['location'] : $book->location,
            'cover' => array_key_exists('cover', $validated) ? $validated['cover'] : $book->cover,
            'is_digital' => (bool) ($validated['is_digital'] ?? $book->is_digital),
            'resource_type' => array_key_exists('resource_type', $validated) ? $validated['resource_type'] : $book->resource_type,
            'file_format' => array_key_exists('file_format', $validated) ? $validated['file_format'] : $book->file_format,
            'file_size' => array_key_exists('file_size', $validated) ? $validated['file_size'] : $book->file_size,
            'file_path' => array_key_exists('file_path', $validated) ? $validated['file_path'] : $book->file_path,
            'file_url' => array_key_exists('file_url', $validated) ? $validated['file_url'] : $book->file_url,
            'download_count' => (int) ($validated['download_count'] ?? $book->download_count),
        ]);
        $book->total_quantity = $nextQuantity;
        $book->available_quantity = max(0, $nextQuantity - $checkedOut);
        $book->is_available = $book->available_quantity > 0;
        $book->save();

        return response()->json(new BookResource($book->fresh()));
    }

    public function destroy(Book $book)
    {
        $hasAnyBorrowing = $book->borrowings()->exists();

        if ($hasAnyBorrowing) {
            return response()->json([
                'message' => 'Không thể xóa sách đã có lịch sử mượn.',
            ], 422);
        }

        $book->delete();

        return response()->json([
            'message' => 'Xóa sách thành công.',
        ]);
    }

    public function uploadDigitalFile(DigitalFileUploadRequest $request, Book $book)
    {
        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = $this->storedDigitalFilename($file->getClientOriginalName(), $extension);
        $directory = 'digital-documents/'.$book->book_id;

        if ($book->file_path && Storage::disk('local')->exists($book->file_path)) {
            Storage::disk('local')->delete($book->file_path);
        }

        $path = $file->storeAs($directory, $filename, 'local');

        $book->fill([
            'is_digital' => true,
            'resource_type' => $book->resource_type ?: 'Tài liệu số',
            'file_format' => $this->digitalFormatFromExtension($extension),
            'file_size' => $this->formatFileSize((int) $file->getSize()),
            'file_path' => $path,
            'file_url' => null,
        ]);
        $book->save();

        return response()->json(new BookResource($book->fresh()));
    }

    public function getDigitalDocuments()
    {
        $documents = Book::query()
            ->where('is_digital', true)
            ->orderByDesc('download_count')
            ->get();

        return DigitalDocumentResource::collection($documents);
    }

    public function downloadDigitalDocument(Request $request, Book $book)
    {
        if (! $book->is_digital && ! $book->file_format && ! $book->file_path && ! $book->file_url) {
            return response()->json([
                'message' => 'Tài liệu số không tồn tại.',
            ], 404);
        }

        $book->increment('download_count');

        $disposition = $request->query('disposition') === 'attachment' ? 'attachment' : 'inline';
        $filename = $this->digitalFilename($book);

        if ($book->file_path) {
            if (Storage::disk('local')->exists($book->file_path)) {
                return response(Storage::disk('local')->get($book->file_path), 200, [
                    'Content-Type' => Storage::disk('local')->mimeType($book->file_path) ?: 'application/octet-stream',
                    'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
                ]);
            }

            $publicDisk = Storage::disk('public');

            if ($publicDisk->exists($book->file_path)) {
                return response($publicDisk->get($book->file_path), 200, [
                    'Content-Type' => $publicDisk->mimeType($book->file_path) ?: 'application/octet-stream',
                    'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
                ]);
            }

            if (Storage::exists($book->file_path)) {
                return response(Storage::get($book->file_path), 200, [
                    'Content-Type' => Storage::mimeType($book->file_path) ?: 'application/octet-stream',
                    'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
                ]);
            }
        }

        if ($book->file_url) {
            return redirect()->away($book->file_url);
        }

        return response($this->fallbackDigitalDocument($book), 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
        ]);
    }

    private function storedDigitalFilename(string $originalName, string $extension): string
    {
        $baseName = pathinfo($originalName, PATHINFO_FILENAME);
        $slug = Str::slug($baseName) ?: 'digital-file';

        return $slug.'.'.$extension;
    }

    private function digitalFormatFromExtension(string $extension): string
    {
        return match ($extension) {
            'pdf' => 'PDF',
            'epub' => 'EPUB',
            'mp3', 'wav', 'm4a' => 'AUDIO',
            'ppt', 'pptx' => 'SLIDES',
            default => strtoupper($extension),
        };
    }

    private function formatFileSize(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 1).' MB';
        }

        return max(1, (int) ceil($bytes / 1024)).' KB';
    }

    private function digitalFilename(Book $book): string
    {
        $pathExtension = $book->file_path
            ? strtolower(pathinfo($book->file_path, PATHINFO_EXTENSION))
            : null;
        $allowedExtensions = ['pdf', 'epub', 'mp3', 'wav', 'm4a', 'txt', 'ppt', 'pptx'];

        if ($pathExtension && in_array($pathExtension, $allowedExtensions, true)) {
            return Str::slug($book->title ?: 'digital-document').'.'.$pathExtension;
        }

        $extension = strtolower((string) ($book->file_format ?: 'txt'));

        if (! in_array($extension, ['pdf', 'epub', 'audio', 'slides'], true)) {
            $extension = 'txt';
        }

        if ($extension === 'audio') {
            $extension = 'mp3';
        }

        if ($extension === 'slides') {
            $extension = 'txt';
        }

        return Str::slug($book->title ?: 'digital-document').'.'.$extension;
    }

    private function fallbackDigitalDocument(Book $book): string
    {
        return implode(PHP_EOL, [
            'Thư viện số HCMUE',
            'Bản xem trước tài nguyên số',
            '',
            'Nhan đề: '.$book->title,
            'Tác giả: '.$book->author,
            'Định dạng: '.($book->file_format ?: 'Chưa cập nhật'),
            'Loại: '.($book->resource_type ?: $book->genre ?: 'Chưa cập nhật'),
            '',
            'Bản ghi này chưa có tệp vật lý đính kèm.',
        ]);
    }
}
