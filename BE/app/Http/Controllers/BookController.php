<?php

namespace App\Http\Controllers;

use App\Http\Requests\BookIndexRequest;
use App\Http\Requests\BookUpsertRequest;
use App\Http\Requests\DigitalFileUploadRequest;
use App\Http\Resources\BookResource;
use App\Http\Resources\DigitalDocumentResource;
use App\Jobs\GenerateBookAiMetadataJob;
use App\Models\Book;
use App\Services\BookCacheService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BookController extends Controller
{
    public function __construct(private readonly BookCacheService $bookCache)
    {
    }

    public function index(BookIndexRequest $request)
    {
        $validated = $request->validated();
        $books = $this->bookCache->remember('index', $validated, function () use ($validated) {
            $query = Book::query()
                ->withCount(['favoritedBy as favorite_count'])
                ->orderBy('book_id');
            $search = trim((string) ($validated['query'] ?? ''));

            if ($search !== '') {
                $query->where(function ($builder) use ($search) {
                    $builder
                        ->where('title', 'like', '%'.$search.'%')
                        ->orWhere('author', 'like', '%'.$search.'%')
                        ->orWhere('genre', 'like', '%'.$search.'%')
                        ->orWhere('ai_summary', 'like', '%'.$search.'%')
                        ->orWhere('ai_tags', 'like', '%'.$search.'%');

                    if (preg_match('/^SACH-(\d+)$/i', $search, $matches)) {
                        $builder->orWhere('book_id', (int) $matches[1]);
                    } elseif (is_numeric($search)) {
                        $builder->orWhere('book_id', (int) $search);
                    }
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

            return $query->paginate($validated['limit'] ?? 15, ['*'], 'page', $validated['page'] ?? 1)
                ->withQueryString();
        });

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

        \App\Jobs\NotifyNewBookJob::dispatch($book);
        GenerateBookAiMetadataJob::dispatch($book->book_id);
        $this->bookCache->bump();

        \App\Services\AuditLoggerService::log('book_create', 'Đã thêm tài liệu mới: ' . $book->title . ' (ID: ' . $book->book_id . ')');

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

        GenerateBookAiMetadataJob::dispatch($book->book_id);
        $this->bookCache->bump();

        \App\Services\AuditLoggerService::log('book_update', 'Đã cập nhật thông tin tài liệu: ' . $book->title . ' (ID: ' . $book->book_id . ')');

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
        $this->bookCache->bump();

        \App\Services\AuditLoggerService::log('book_delete', 'Đã xóa tài liệu: ' . $book->title . ' (ID: ' . $book->book_id . ')');

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

        GenerateBookAiMetadataJob::dispatch($book->book_id);
        $this->bookCache->bump();

        \App\Services\AuditLoggerService::log('digital_file_upload', 'Đã tải lên tệp tài liệu số cho sách: ' . $book->title . ' (ID: ' . $book->book_id . ')');

        return response()->json(new BookResource($book->fresh()));
    }

    public function getDigitalDocuments()
    {
        $documents = $this->bookCache->remember('digital-documents', [], function () {
            return Book::query()
                ->where('is_digital', true)
                ->withCount(['favoritedBy as favorite_count'])
                ->orderByDesc('download_count')
                ->get();
        }, 120);

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
        $this->bookCache->bump();

        \App\Services\AuditLoggerService::log('digital_file_download', 'Đã đọc trực tuyến/tải xuống tài liệu số: ' . $book->title . ' (ID: ' . $book->book_id . ')');

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

    public function autocomplete(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json([]);
        }

        $search = '%' . $q . '%';
        $books = $this->bookCache->remember('autocomplete', ['q' => $q], function () use ($search) {
            return Book::query()
                ->where('title', 'like', $search)
                ->orWhere('author', 'like', $search)
                ->orWhere('genre', 'like', $search)
                ->orWhere('ai_summary', 'like', $search)
                ->orWhere('ai_tags', 'like', $search)
                ->orderBy('title')
                ->limit(5)
                ->get(['book_id', 'title', 'author', 'genre', 'cover', 'is_digital', 'ai_summary', 'ai_tags']);
        });

        return response()->json($books);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:4096',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();

        $handle = fopen($path, 'r');
        if (!$handle) {
            return response()->json(['message' => 'Không thể mở tệp tin.'], 400);
        }

        $header = fgetcsv($handle, 1000, ",");
        if (!$header) {
            fclose($handle);
            return response()->json(['message' => 'Tệp tin trống hoặc không hợp lệ.'], 400);
        }

        $header = array_map(function($h) {
            return trim(preg_replace('/[\x{FEFF}\x{200B}]/u', '', $h));
        }, $header);

        // Expected headers
        $colMap = [
            'title' => array_search('title', $header) !== false ? array_search('title', $header) : array_search('ten_sach', $header),
            'author' => array_search('author', $header) !== false ? array_search('author', $header) : array_search('tac_gia', $header),
            'genre' => array_search('genre', $header) !== false ? array_search('genre', $header) : array_search('the_loai', $header),
            'published_year' => array_search('published_year', $header) !== false ? array_search('published_year', $header) : array_search('nam_xuat_ban', $header),
            'location' => array_search('location', $header) !== false ? array_search('location', $header) : array_search('vi_tri', $header),
            'quantity' => array_search('quantity', $header) !== false ? array_search('quantity', $header) : array_search('so_luong', $header),
            'is_digital' => array_search('is_digital', $header) !== false ? array_search('is_digital', $header) : array_search('sach_so', $header),
        ];

        if ($colMap['title'] === false) $colMap['title'] = 0;
        if ($colMap['author'] === false) $colMap['author'] = 1;
        if ($colMap['genre'] === false) $colMap['genre'] = 2;
        if ($colMap['published_year'] === false) $colMap['published_year'] = 3;
        if ($colMap['location'] === false) $colMap['location'] = 4;
        if ($colMap['quantity'] === false) $colMap['quantity'] = 5;
        if ($colMap['is_digital'] === false) $colMap['is_digital'] = 6;

        $successCount = 0;
        $errors = [];
        $rowNum = 1;

        DB::beginTransaction();
        try {
            while (($row = fgetcsv($handle, 1000, ",")) !== false) {
                $rowNum++;

                if (empty(array_filter($row))) {
                    continue;
                }

                $title = trim($row[$colMap['title']] ?? '');
                $author = trim($row[$colMap['author']] ?? '');
                $genre = trim($row[$colMap['genre']] ?? '');
                $publishedYear = trim($row[$colMap['published_year']] ?? '');
                $location = trim($row[$colMap['location']] ?? '');
                $quantityStr = trim($row[$colMap['quantity']] ?? '1');
                $isDigitalStr = trim($row[$colMap['is_digital']] ?? '0');

                if (empty($title)) {
                    $errors[] = "Dòng $rowNum: Tên sách không được để trống.";
                    continue;
                }

                if (empty($author)) {
                    $errors[] = "Dòng $rowNum: Tác giả không được để trống.";
                    continue;
                }

                $quantity = is_numeric($quantityStr) ? (int)$quantityStr : 1;
                if ($quantity < 0) {
                    $errors[] = "Dòng $rowNum: Số lượng sách không được nhỏ hơn 0.";
                    continue;
                }

                $isDigital = filter_var($isDigitalStr, FILTER_VALIDATE_BOOLEAN);

                Book::create([
                    'title' => $title,
                    'author' => $author,
                    'genre' => !empty($genre) ? $genre : null,
                    'published_year' => !empty($publishedYear) && is_numeric($publishedYear) ? (int)$publishedYear : null,
                    'location' => !empty($location) ? $location : null,
                    'is_digital' => $isDigital,
                    'total_quantity' => $quantity,
                    'available_quantity' => $quantity,
                    'is_available' => $quantity > 0,
                ]);

                $successCount++;
            }

            fclose($handle);

            if (count($errors) > 0) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Nhập dữ liệu thất bại do có lỗi validation.',
                    'errors' => $errors,
                    'success_count' => 0
                ], 422);
            }

            DB::commit();

            if (isset($this->bookCache)) {
                $this->bookCache->bump();
            }

            \App\Services\AuditLoggerService::log('book_import', "Đã import thành công $successCount sách từ file CSV.");

            return response()->json([
                'message' => "Nhập dữ liệu thành công. Đã thêm $successCount sách.",
                'success_count' => $successCount,
                'errors' => []
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            fclose($handle);
            return response()->json([
                'message' => 'Đã xảy ra lỗi trong quá trình nhập dữ liệu: ' . $e->getMessage()
            ], 500);
        }
    }
}
