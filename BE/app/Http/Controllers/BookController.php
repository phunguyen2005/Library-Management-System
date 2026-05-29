<?php

namespace App\Http\Controllers;

use App\Http\Requests\BookIndexRequest;
use App\Http\Requests\BookUpsertRequest;
use App\Http\Requests\DigitalFileUploadRequest;
use App\Http\Resources\BookCopyResource;
use App\Http\Resources\BookResource;
use App\Http\Resources\DigitalDocumentResource;
use App\Jobs\GenerateBookAiMetadataJob;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Borrowing;
use App\Models\DigitalDocumentAccess;
use App\Models\Librarian;
use App\Models\Member;
use App\Services\BookCacheService;
use App\Support\BookClassification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

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
                ->withCount([
                    'favoritedBy as favorite_count',
                    'digitalDownloads as digital_downloads_count',
                    'reviews as reviews_count',
                ])
                ->withAvg('reviews', 'rating');
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

            match ($validated['sort'] ?? 'title') {
                'newest' => $query->orderByDesc('published_year')->orderBy('title')->orderBy('book_id'),
                'available' => $query->orderByDesc('available_quantity')->orderBy('title')->orderBy('book_id'),
                default => $query->orderBy('title')->orderBy('book_id'),
            };

            return $query->paginate($validated['limit'] ?? 15, ['*'], 'page', $validated['page'] ?? 1)
                ->withQueryString();
        });

        return BookResource::collection($books);
    }

    public function show(Book $book)
    {
        $book->loadCount([
            'favoritedBy as favorite_count',
            'digitalDownloads as digital_downloads_count',
            'reviews as reviews_count',
        ])->loadAvg('reviews', 'rating');
        return new BookResource($book);
    }

    public function store(BookUpsertRequest $request)
    {
        $validated = $request->validated();
        $isDigital = (bool) ($validated['is_digital'] ?? false);
        if (! $isDigital) {
            $normalizedClassification = BookClassification::normalizePhysical(
                $validated['genre'] ?? null,
                $validated['location'] ?? null,
            );

            if ($normalizedClassification === null) {
                return response()->json([
                    'message' => 'Phân loại sách phải thuộc một nhóm trên sơ đồ thư viện A-J.',
                    'errors' => [
                        'genre' => ['Phân loại sách phải thuộc một nhóm trên sơ đồ thư viện A-J.'],
                    ],
                ], 422);
            }

            $validated = array_merge($validated, $normalizedClassification);
        }
        $quantity = array_key_exists('quantity', $validated) ? (int) $validated['quantity'] : 1;

        $book = Book::query()->create([
            'title' => $validated['title'],
            'author' => $validated['author'],
            'genre' => $validated['genre'] ?? null,
            'published_year' => $validated['published_year'] ?? null,
            'location' => $validated['location'] ?? null,
            'cover' => $validated['cover'] ?? null,
            'is_digital' => $isDigital,
            'resource_type' => $validated['resource_type'] ?? null,
            'file_format' => $validated['file_format'] ?? null,
            'file_size' => $validated['file_size'] ?? null,
            'file_path' => $validated['file_path'] ?? null,
            'file_url' => $validated['file_url'] ?? null,
            'download_count' => 0,
            'total_quantity' => $quantity,
            'available_quantity' => $quantity,
            'is_available' => $quantity > 0,
        ]);

        // For physical books: notify and generate AI metadata immediately.
        // For digital books: notification and AI metadata are deferred to uploadDigitalFile()
        // so that emails only go out after the file is successfully attached.
        if (! $isDigital) {
            \App\Jobs\NotifyNewBookJob::dispatch($book);
            GenerateBookAiMetadataJob::dispatch($book->book_id);
        }

        $this->bookCache->bump();

        \App\Services\AuditLoggerService::log('book_create', 'Đã thêm tài liệu mới: ' . $book->title . ' (ID: ' . $book->book_id . ')');

        return response()->json(new BookResource($book->fresh()), 201);
    }

    public function update(BookUpsertRequest $request, Book $book)
    {
        $validated = $request->validated();
        $isDigital = (bool) ($validated['is_digital'] ?? $book->is_digital);

        if (! $isDigital) {
            $normalizedClassification = BookClassification::normalizePhysical(
                array_key_exists('genre', $validated) ? $validated['genre'] : $book->genre,
                array_key_exists('location', $validated) ? $validated['location'] : $book->location,
            );

            if ($normalizedClassification === null) {
                return response()->json([
                    'message' => 'Phân loại sách phải thuộc một nhóm trên sơ đồ thư viện A-J.',
                    'errors' => [
                        'genre' => ['Phân loại sách phải thuộc một nhóm trên sơ đồ thư viện A-J.'],
                    ],
                ], 422);
            }

            $validated = array_merge($validated, $normalizedClassification);
        }

        $nextQuantity = array_key_exists('quantity', $validated) ? (int) $validated['quantity'] : $book->total_quantity;

        $book = DB::transaction(function () use ($book, $validated, $isDigital, $nextQuantity) {
            $book = Book::query()->lockForUpdate()->findOrFail($book->book_id);

            $book->fill([
                'title' => $validated['title'],
                'author' => $validated['author'],
                'genre' => array_key_exists('genre', $validated) ? $validated['genre'] : $book->genre,
                'published_year' => array_key_exists('published_year', $validated) ? $validated['published_year'] : $book->published_year,
                'location' => array_key_exists('location', $validated) ? $validated['location'] : $book->location,
                'cover' => array_key_exists('cover', $validated) ? $validated['cover'] : $book->cover,
                'is_digital' => $isDigital,
                'resource_type' => array_key_exists('resource_type', $validated) ? $validated['resource_type'] : $book->resource_type,
                'file_format' => array_key_exists('file_format', $validated) ? $validated['file_format'] : $book->file_format,
                'file_size' => array_key_exists('file_size', $validated) ? $validated['file_size'] : $book->file_size,
                'file_path' => array_key_exists('file_path', $validated) ? $validated['file_path'] : $book->file_path,
                'file_url' => array_key_exists('file_url', $validated) ? $validated['file_url'] : $book->file_url,
            ]);

            if (strtoupper((string) $book->file_format) === 'AUDIO') {
                $book->forceFill([
                    'ai_summary' => null,
                    'ai_tags' => [],
                    'ai_summary_generated_at' => null,
                ]);
            }

            $book->save();

            if (! $isDigital) {
                $this->reconcilePhysicalCopies($book, $nextQuantity);
            } else {
                BookCopy::syncBookCounters($book);
            }

            return $book->fresh();
        });

        GenerateBookAiMetadataJob::dispatch($book->book_id);
        $this->bookCache->bump();

        \App\Services\AuditLoggerService::log('book_update', 'Đã cập nhật thông tin tài liệu: ' . $book->title . ' (ID: ' . $book->book_id . ')');

        $book->loadCount([
            'favoritedBy as favorite_count',
            'digitalDownloads as digital_downloads_count',
            'reviews as reviews_count',
        ])->loadAvg('reviews', 'rating');

        return response()->json(new BookResource($book));
    }

    public function destroy(Book $book)
    {
        $hasAnyBorrowing = $book->borrowings()->exists();

        if (! $book->is_digital && $hasAnyBorrowing) {
            return response()->json([
                'message' => 'Không thể xóa sách đã có lịch sử mượn.',
            ], 422);
        }

        // Xóa file Cloudinary liên quan nếu có
        if ($book->cloudinary_public_id) {
            $cloudinaryService = new \App\Services\CloudinaryService();
            $cloudinaryService->delete($book->cloudinary_public_id, $book->file_format ?: 'pdf');
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

        // Khởi tạo CloudinaryService
        $cloudinaryService = new \App\Services\CloudinaryService();

        // Nếu đã có file cũ trên Cloudinary, tiến hành xóa
        if ($book->cloudinary_public_id) {
            $cloudinaryService->delete($book->cloudinary_public_id, $book->file_format ?: $extension);
        }

        // Upload file mới lên Cloudinary
        try {
            $uploadResult = $cloudinaryService->upload($file, 'library_digital_files');
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Tải file lên Cloudinary thất bại: ' . $e->getMessage(),
            ], 500);
        }

        $format = $this->digitalFormatFromExtension($extension);
        $isAudio = $format === 'AUDIO';

        $book->fill([
            'is_digital' => true,
            'resource_type' => $book->resource_type ?: ($isAudio ? 'Audio Book' : 'Tài liệu số'),
            'file_format' => $format,
            'file_size' => $this->formatFileSize((int) $file->getSize()),
            'file_path' => null, // Đặt null vì không lưu local nữa
            'file_url' => $uploadResult['secure_url'],
            'cloudinary_public_id' => $uploadResult['public_id'],
        ]);

        if ($isAudio) {
            $book->forceFill([
                'ai_summary' => null,
                'ai_tags' => [],
                'ai_summary_generated_at' => null,
            ]);
        }

        $book->save();

        // Skip AI metadata generation for audio files — AI summaries are irrelevant for audio.
        if (! $isAudio) {
            GenerateBookAiMetadataJob::dispatch($book->book_id);
        }

        // Send new-book notification now that the file is confirmed uploaded.
        \App\Jobs\NotifyNewBookJob::dispatch($book);

        $this->bookCache->bump();

        \App\Services\AuditLoggerService::log('digital_file_upload', 'Đã tải lên tệp tài liệu số (Cloudinary) cho sách: ' . $book->title . ' (ID: ' . $book->book_id . ')');

        $book->loadCount([
            'favoritedBy as favorite_count',
            'digitalDownloads as digital_downloads_count',
            'reviews as reviews_count',
        ])->loadAvg('reviews', 'rating');

        return response()->json(new BookResource($book));
    }

    public function getDigitalDocuments()
    {
        $documents = $this->bookCache->remember('digital-documents', [], function () {
            return Book::query()
                ->where('is_digital', true)
                ->withCount([
                    'favoritedBy as favorite_count',
                    'digitalDownloads as digital_downloads_count',
                    'reviews as reviews_count',
                ])
                ->withAvg('reviews', 'rating')
                ->orderByDesc('digital_downloads_count')
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

        $disposition = $request->query('disposition') === 'attachment' ? 'attachment' : 'inline';

        $actor = $this->signedAccessActor($request);
        if ($disposition === 'attachment' && $actor instanceof Member && $actor->level < 5) {
            return response()->json([
                'message' => 'Bạn phải đạt cấp độ 5 (Level 5) trong hệ thống để tải tài liệu này.',
            ], 403);
        }

        $accessType = $disposition === 'attachment'
            ? DigitalDocumentAccess::TYPE_DOWNLOAD
            : DigitalDocumentAccess::TYPE_PREVIEW;

        $this->recordDigitalDocumentAccess($request, $book, $accessType);
        $this->bookCache->bump();

        \App\Services\AuditLoggerService::log('digital_file_download', 'Đã đọc trực tuyến/tải xuống tài liệu số: ' . $book->title . ' (ID: ' . $book->book_id . ')', $this->signedAccessActor($request));

        $filename = $this->digitalFilename($book);

        // Chỉ redirect nếu file được lưu trên Cloudinary (có public_id)
        if ($book->cloudinary_public_id && $book->file_url) {
            $isPdf = strtoupper((string) $book->file_format) === 'PDF'
                || str_ends_with(strtolower((string) $book->file_url), '.pdf')
                || str_ends_with(strtolower((string) $book->file_path), '.pdf');

            if ($disposition === 'inline' && $isPdf) {
                try {
                    $response = \Illuminate\Support\Facades\Http::withOptions([
                        'stream' => true,
                        'verify' => false, // Bypass local SSL issues on dev environments (XAMPP/Windows)
                    ])->get($book->file_url);

                    if ($response->successful()) {
                        // Clear X-Frame-Options to allow framing from React frontend origins
                        header_remove('X-Frame-Options');

                        return response()->stream(function () use ($response) {
                            $body = $response->toPsrResponse()->getBody();
                            if ($body->isSeekable()) {
                                $body->rewind();
                            }
                            $chunkRead = false;
                            while (!$body->eof()) {
                                $chunk = $body->read(8192);
                                if ($chunk !== '') {
                                    echo $chunk;
                                    $chunkRead = true;
                                }
                            }
                            if (!$chunkRead) {
                                echo $response->body();
                            }
                        }, 200, [
                            'Content-Type' => 'application/pdf',
                            'Content-Disposition' => 'inline; filename="'.$filename.'"',
                            'Content-Security-Policy' => "frame-ancestors 'self' http://localhost:5173 http://localhost:3000 http://127.0.0.1:5173 http://127.0.0.1:3000 http://localhost:8000 http://127.0.0.1:8000",
                        ]);
                    }
                } catch (\Exception $e) {
                    \Log::error("Failed to stream Cloudinary PDF file for book ID {$book->book_id}: " . $e->getMessage());
                }
            }
            return redirect()->away($book->file_url);
        }

        // Còn lại đọc từ Local Disk
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

        // Fallback cho URL ngoài khác (nếu có)
        if ($book->file_url) {
            return redirect()->away($book->file_url);
        }

        return response($this->fallbackDigitalDocument($book), 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
        ]);
    }

    private function reconcilePhysicalCopies(Book $book, int $nextQuantity): void
    {
        $trackedTotal = $book->copies()
            ->where('status', '!=', BookCopy::STATUS_LOST)
            ->count();

        if ($trackedTotal === 0 && $nextQuantity > 0) {
            BookCopy::createCopiesForBook($book, $nextQuantity);
            return;
        }

        if ($nextQuantity > $trackedTotal) {
            BookCopy::createCopiesForBook($book, $nextQuantity - $trackedTotal);
            return;
        }

        if ($nextQuantity < $trackedTotal) {
            $removeCount = $trackedTotal - $nextQuantity;
            $availableCopies = $book->copies()
                ->where('status', BookCopy::STATUS_AVAILABLE)
                ->count();
            $approvedHolds = $book->borrowings()
                ->where('status', Borrowing::STATUS_APPROVED)
                ->whereNull('copy_id')
                ->count();
            $removableCopies = max(0, $availableCopies - $approvedHolds);

            if ($removeCount > $removableCopies) {
                throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                    'message' => 'Số lượng mới không thể nhỏ hơn số bản sao đang được mượn, sửa chữa hoặc giữ chỗ.',
                ], 422));
            }

            $book->copies()
                ->where('status', BookCopy::STATUS_AVAILABLE)
                ->orderByDesc('id')
                ->limit($removeCount)
                ->get()
                ->each
                ->delete();
        }

        BookCopy::syncBookCounters($book->fresh());
    }

    private function statusForCondition(string $condition): string
    {
        return match ($condition) {
            BookCopy::CONDITION_DAMAGED => BookCopy::STATUS_REPAIRING,
            BookCopy::CONDITION_LOST => BookCopy::STATUS_LOST,
            default => BookCopy::STATUS_AVAILABLE,
        };
    }

    private function ensureCopyBelongsToBook(Book $book, BookCopy $copy): void
    {
        if ((int) $copy->book_id !== (int) $book->book_id) {
            abort(404);
        }
    }

    private function recordDigitalDocumentAccess(Request $request, Book $book, string $accessType): void
    {
        DigitalDocumentAccess::query()->create([
            'book_id' => $book->book_id,
            'member_id' => $this->signedIntegerQuery($request, 'member_id'),
            'librarian_id' => $this->signedIntegerQuery($request, 'librarian_id'),
            'access_type' => $accessType,
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 1000, ''),
            'accessed_at' => now(),
        ]);

        if ($accessType === DigitalDocumentAccess::TYPE_DOWNLOAD) {
            $book->forceFill([
                'download_count' => $book->digitalDownloads()->count(),
            ])->save();
        }
    }

    private function signedAccessActor(Request $request): Member|Librarian|null
    {
        $memberId = $this->signedIntegerQuery($request, 'member_id');

        if ($memberId !== null) {
            return Member::query()->find($memberId);
        }

        $librarianId = $this->signedIntegerQuery($request, 'librarian_id');

        if ($librarianId !== null) {
            return Librarian::query()->find($librarianId);
        }

        return null;
    }

    private function signedIntegerQuery(Request $request, string $key): ?int
    {
        $value = $request->query($key);

        if (is_numeric($value) && (int) $value > 0) {
            return (int) $value;
        }

        return null;
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
            'dry_run' => 'nullable|boolean',
            'allow_partial' => 'nullable|boolean',
            'column_mapping' => 'nullable|string', // JSON mapping
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();

        $handle = fopen($path, 'r');
        if (!$handle) {
            return response()->json(['message' => 'Không thể mở tệp tin.'], 400);
        }

        // Auto-detect delimiter: read first line as raw text and count tabs vs commas
        $firstLine = fgets($handle);
        if ($firstLine === false) {
            fclose($handle);
            return response()->json(['message' => 'Tệp tin trống hoặc không hợp lệ.'], 400);
        }
        $tabCount   = substr_count($firstLine, "\t");
        $commaCount = substr_count($firstLine, ',');
        $delimiter  = ($tabCount > 0 && $tabCount >= $commaCount) ? "\t" : ",";

        // Rewind to re-read the header line with fgetcsv using the detected delimiter
        rewind($handle);

        $header = fgetcsv($handle, 0, $delimiter);
        if (!$header) {
            fclose($handle);
            return response()->json(['message' => 'Tệp tin trống hoặc không hợp lệ.'], 400);
        }

        $header = array_map(function($h) {
            // Strip BOM, zero-width space, and null bytes (common in UTF-16 files read as UTF-8)
            return trim(preg_replace('/[\x{FEFF}\x{200B}\x00]/u', '', $h));
        }, $header);

        $columnMapping = [];
        if ($request->has('column_mapping')) {
            $columnMapping = json_decode($request->input('column_mapping'), true) ?: [];
        }

        // Expected headers mapping
        $colMap = [];
        foreach (['title', 'author', 'genre', 'published_year', 'location', 'quantity', 'is_digital'] as $key) {
            $csvColName = $columnMapping[$key] ?? null;
            if ($csvColName !== null) {
                $idx = array_search(trim($csvColName), $header);
                if ($idx !== false) {
                    $colMap[$key] = $idx;
                    continue;
                }
            }

            // Fallback
            $fallbackField = match($key) {
                'title' => 'ten_sach',
                'author' => 'tac_gia',
                'genre' => 'the_loai',
                'published_year' => 'nam_xuat_ban',
                'location' => 'vi_tri',
                'quantity' => 'so_luong',
                'is_digital' => 'sach_so',
                default => null
            };

            $idx = array_search($key, $header);
            if ($idx === false && $fallbackField) {
                $idx = array_search($fallbackField, $header);
            }
            $colMap[$key] = $idx;
        }

        // Title and Author are strictly required
        if ($colMap['title'] === false) {
            fclose($handle);
            return response()->json(['message' => 'Không tìm thấy cột Tiêu đề (title) trong tệp CSV.'], 422);
        }
        if ($colMap['author'] === false) {
            fclose($handle);
            return response()->json(['message' => 'Không tìm thấy cột Tác giả (author) trong tệp CSV.'], 422);
        }

        $dryRun = filter_var($request->input('dry_run', false), FILTER_VALIDATE_BOOLEAN);
        $allowPartial = filter_var($request->input('allow_partial', false), FILTER_VALIDATE_BOOLEAN);

        $successCount = 0;
        $errors = [];
        $rowNum = 1;

        DB::beginTransaction();
        try {
            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                $rowNum++;

                if (empty(array_filter($row))) {
                    continue;
                }

                $title = trim($row[$colMap['title']] ?? '');
                $author = trim($row[$colMap['author']] ?? '');
                $genre = $colMap['genre'] !== false ? trim($row[$colMap['genre']] ?? '') : '';
                $publishedYear = $colMap['published_year'] !== false ? trim($row[$colMap['published_year']] ?? '') : '';
                $location = $colMap['location'] !== false ? trim($row[$colMap['location']] ?? '') : '';
                $quantityStr = $colMap['quantity'] !== false ? trim($row[$colMap['quantity']] ?? '1') : '1';
                $isDigitalStr = $colMap['is_digital'] !== false ? trim($row[$colMap['is_digital']] ?? '0') : '0';

                $rowErrors = [];

                if (empty($title)) {
                    $rowErrors[] = "Tên sách không được để trống.";
                }

                if (empty($author)) {
                    $rowErrors[] = "Tác giả không được để trống.";
                }

                $quantity = is_numeric($quantityStr) ? (int)$quantityStr : 1;
                if ($quantity < 0) {
                    $rowErrors[] = "Số lượng sách không được nhỏ hơn 0.";
                }

                $isDigital = filter_var($isDigitalStr, FILTER_VALIDATE_BOOLEAN);

                if (!$isDigital) {
                    $normalizedClassification = BookClassification::normalizePhysical($genre, $location);

                    if ($normalizedClassification === null) {
                        $rowErrors[] = "Phân loại sách phải thuộc một nhóm trên sơ đồ thư viện A-J (Thể loại: '$genre', Kệ: '$location').";
                    } else {
                        $genre = $normalizedClassification['genre'];
                        $location = $normalizedClassification['location'];
                    }
                }

                if (count($rowErrors) > 0) {
                    foreach ($rowErrors as $err) {
                        $errors[] = "Dòng $rowNum: $err";
                    }
                    continue;
                }

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

            if ($dryRun) {
                DB::rollBack();
                return response()->json([
                    'message' => count($errors) > 0 
                        ? 'Chạy thử hoàn tất: Có một số lỗi dữ liệu được phát hiện.' 
                        : 'Chạy thử hoàn tất: Dữ liệu hoàn toàn hợp lệ và sẵn sàng nhập.',
                    'dry_run' => true,
                    'errors' => $errors,
                    'success_count' => $successCount
                ]);
            }

            if (count($errors) > 0 && !$allowPartial) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Nhập dữ liệu thất bại do có lỗi validation.',
                    'errors' => $errors,
                    'success_count' => 0
                ], 422);
            }

            DB::commit();

            if (isset($this->bookCache) && $successCount > 0) {
                $this->bookCache->bump();
            }

            if ($successCount > 0) {
                \App\Services\AuditLoggerService::log('book_import', "Đã import thành công $successCount sách từ file CSV.");
            }

            return response()->json([
                'message' => count($errors) > 0 
                    ? "Nhập dữ liệu hoàn tất. Đã thêm thành công $successCount sách, bỏ qua " . (count($errors)) . " lỗi."
                    : "Nhập dữ liệu thành công. Đã thêm $successCount sách.",
                'success_count' => $successCount,
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            fclose($handle);
            return response()->json([
                'message' => 'Đã xảy ra lỗi trong quá trình nhập dữ liệu: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getCopies(Book $book)
    {
        if ($book->is_digital) {
            return response()->json([
                'message' => 'Tài nguyên số không có bản sao vật lý.',
            ], 422);
        }

        return BookCopyResource::collection(
            $book->copies()->orderBy('id')->get()
        );
    }

    public function addCopy(Request $request, Book $book)
    {
        if ($book->is_digital) {
            return response()->json([
                'message' => 'Không thể thêm bản sao vật lý cho tài nguyên số.',
            ], 422);
        }

        $validated = $request->validate([
            'barcode' => ['nullable', 'string', 'max:255', Rule::unique('book_copies', 'barcode')],
            'status' => ['nullable', 'string', Rule::in(BookCopy::statuses())],
            'condition' => ['nullable', 'string', Rule::in(BookCopy::conditions())],
        ]);

        $copy = DB::transaction(function () use ($book, $validated) {
            $book = Book::query()->lockForUpdate()->findOrFail($book->book_id);
            $condition = $validated['condition'] ?? BookCopy::CONDITION_GOOD;
            $status = $validated['status'] ?? $this->statusForCondition($condition);

            $copy = BookCopy::query()->create([
                'book_id' => $book->book_id,
                'barcode' => $validated['barcode'] ?? BookCopy::generateBarcode($book),
                'status' => $status,
                'condition' => $condition,
                'added_at' => now(),
            ]);

            BookCopy::syncBookCounters($book);

            return $copy->fresh();
        });

        $this->bookCache->bump();

        return response()->json(new BookCopyResource($copy), 201);
    }

    public function updateCopy(Request $request, Book $book, BookCopy $copy)
    {
        $this->ensureCopyBelongsToBook($book, $copy);

        $validated = $request->validate([
            'barcode' => ['nullable', 'string', 'max:255', Rule::unique('book_copies', 'barcode')->ignore($copy->id)],
            'status' => ['nullable', 'string', Rule::in(BookCopy::statuses())],
            'condition' => ['nullable', 'string', Rule::in(BookCopy::conditions())],
        ]);

        $copy = DB::transaction(function () use ($book, $copy, $validated) {
            $book = Book::query()->lockForUpdate()->findOrFail($book->book_id);
            $copy = BookCopy::query()->where('book_id', $book->book_id)->lockForUpdate()->findOrFail($copy->id);

            $activeBorrowing = $copy->borrowings()
                ->where('status', Borrowing::STATUS_BORROWED)
                ->exists();
            $nextStatus = $validated['status'] ?? (
                array_key_exists('condition', $validated)
                    ? $this->statusForCondition($validated['condition'])
                    : $copy->status
            );

            if ($activeBorrowing && $nextStatus !== BookCopy::STATUS_BORROWED) {
                throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                    'message' => 'Không thể đổi trạng thái bản sao đang được mượn.',
                ], 422));
            }

            if ($nextStatus === BookCopy::STATUS_BORROWED && ! $activeBorrowing) {
                throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                    'message' => 'Chỉ quy trình giao sách mới được chuyển bản sao sang trạng thái đang mượn.',
                ], 422));
            }

            $copy->fill([
                'barcode' => array_key_exists('barcode', $validated) ? $validated['barcode'] : $copy->barcode,
                'status' => $nextStatus,
                'condition' => array_key_exists('condition', $validated) ? $validated['condition'] : $copy->condition,
            ])->save();

            BookCopy::syncBookCounters($book);

            return $copy->fresh();
        });

        $this->bookCache->bump();

        return response()->json(new BookCopyResource($copy));
    }

    public function deleteCopy(Book $book, BookCopy $copy)
    {
        $this->ensureCopyBelongsToBook($book, $copy);

        DB::transaction(function () use ($book, $copy) {
            $book = Book::query()->lockForUpdate()->findOrFail($book->book_id);
            $copy = BookCopy::query()->where('book_id', $book->book_id)->lockForUpdate()->findOrFail($copy->id);

            if ($copy->status === BookCopy::STATUS_BORROWED) {
                throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                    'message' => 'Không thể xóa bản sao đang được mượn.',
                ], 422));
            }

            if ($copy->status === BookCopy::STATUS_AVAILABLE) {
                $availableCopies = $book->copies()->where('status', BookCopy::STATUS_AVAILABLE)->count();
                $approvedHolds = $book->borrowings()
                    ->where('status', Borrowing::STATUS_APPROVED)
                    ->whereNull('copy_id')
                    ->count();

                if (($availableCopies - 1) < $approvedHolds) {
                    throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                        'message' => 'Không thể xóa bản sao đang được giữ chỗ cho phiếu đã duyệt.',
                    ], 422));
                }
            }

            $copy->delete();
            BookCopy::syncBookCounters($book);
        });

        $this->bookCache->bump();

        return response()->json([
            'message' => 'Đã xóa bản sao sách.',
        ]);
    }

    public function completeRepair(Request $request, int $bookId)
    {
        $librarian = $request->user();
        $validated = $request->validate([
            'copy_id' => ['nullable', 'integer', 'exists:book_copies,id'],
            'barcode' => ['nullable', 'string', 'max:255'],
        ]);

        $book = DB::transaction(function () use ($bookId, $librarian, $validated) {
            $book = Book::query()->lockForUpdate()->findOrFail($bookId);

            $copyQuery = $book->copies()
                ->where('status', BookCopy::STATUS_REPAIRING)
                ->lockForUpdate();

            if (! empty($validated['copy_id'])) {
                $copyQuery->where('id', $validated['copy_id']);
            }

            if (! empty($validated['barcode'])) {
                $copyQuery->where('barcode', $validated['barcode']);
            }

            $copy = $copyQuery->orderBy('id')->first();

            if (! $copy) {
                abort(response()->json([
                    'message' => 'Không có bản sao nào của sách này đang ở trạng thái sửa chữa.'
                ], 422));
            }

            $copy->forceFill([
                'status' => BookCopy::STATUS_AVAILABLE,
                'condition' => BookCopy::CONDITION_GOOD,
                'last_checked_in_at' => now(),
            ])->save();

            // Trigger reservations queue check to release or assign to next student
            \App\Http\Controllers\BorrowController::processNextInQueue($book->book_id);
            BookCopy::syncBookCounters($book->fresh());

            \App\Services\AuditLoggerService::log(
                'book_repair_complete',
                'Hoàn tất sửa chữa bản sao ' . $copy->barcode . ' của sách: ' . $book->title . ' (ID: ' . $book->book_id . ')',
                $librarian
            );

            return $book->fresh();
        });

        // Bump cache
        $this->bookCache->bump();

        $book = $book->fresh();

        $book->loadCount([
            'favoritedBy as favorite_count',
            'digitalDownloads as digital_downloads_count',
            'reviews as reviews_count',
        ])->loadAvg('reviews', 'rating');

        return response()->json([
            'message' => 'Đã hoàn tất sửa chữa sách và đưa trở lại kệ.',
            'book' => new BookResource($book),
        ]);
    }
}
