<?php

namespace App\Http\Controllers;

use App\Http\Requests\BookIndexRequest;
use App\Http\Requests\BookUpsertRequest;
use App\Http\Requests\DigitalFileUploadRequest;
use App\Http\Resources\BookResource;
use App\Http\Resources\DigitalDocumentResource;
use App\Jobs\GenerateBookAiMetadataJob;
use App\Models\Book;
use App\Models\DigitalDocumentAccess;
use App\Models\Librarian;
use App\Models\Member;
use App\Services\BookCacheService;
use App\Support\BookClassification;
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
                ->withCount([
                    'favoritedBy as favorite_count',
                    'digitalDownloads as digital_downloads_count',
                    'reviews as reviews_count',
                ])
                ->withAvg('reviews', 'rating')
                ->orderByDesc('book_id');
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

        \App\Jobs\NotifyNewBookJob::dispatch($book);
        GenerateBookAiMetadataJob::dispatch($book->book_id);
        $this->bookCache->bump();

        \App\Services\AuditLoggerService::log('book_create', 'Đã thêm tài liệu mới: ' . $book->title . ' (ID: ' . $book->book_id . ')');

        return response()->json(new BookResource($book), 201);
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
            'is_digital' => $isDigital,
            'resource_type' => array_key_exists('resource_type', $validated) ? $validated['resource_type'] : $book->resource_type,
            'file_format' => array_key_exists('file_format', $validated) ? $validated['file_format'] : $book->file_format,
            'file_size' => array_key_exists('file_size', $validated) ? $validated['file_size'] : $book->file_size,
            'file_path' => array_key_exists('file_path', $validated) ? $validated['file_path'] : $book->file_path,
            'file_url' => array_key_exists('file_url', $validated) ? $validated['file_url'] : $book->file_url,
        ]);
        $book->total_quantity = $nextQuantity;
        $book->available_quantity = max(0, $nextQuantity - $checkedOut);
        $book->is_available = $book->available_quantity > 0;
        $book->save();

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
        $accessType = $disposition === 'attachment'
            ? DigitalDocumentAccess::TYPE_DOWNLOAD
            : DigitalDocumentAccess::TYPE_PREVIEW;

        $this->recordDigitalDocumentAccess($request, $book, $accessType);
        $this->bookCache->bump();

        \App\Services\AuditLoggerService::log('digital_file_download', 'Đã đọc trực tuyến/tải xuống tài liệu số: ' . $book->title . ' (ID: ' . $book->book_id . ')', $this->signedAccessActor($request));

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

        $header = fgetcsv($handle, 1000, ",");
        if (!$header) {
            fclose($handle);
            return response()->json(['message' => 'Tệp tin trống hoặc không hợp lệ.'], 400);
        }

        $header = array_map(function($h) {
            return trim(preg_replace('/[\x{FEFF}\x{200B}]/u', '', $h));
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
            while (($row = fgetcsv($handle, 1000, ",")) !== false) {
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

    public function completeRepair(Request $request, int $bookId)
    {
        $librarian = $request->user();

        $book = DB::transaction(function () use ($bookId, $librarian) {
            $book = Book::query()->lockForUpdate()->findOrFail($bookId);

            if (($book->repairing_quantity ?? 0) <= 0) {
                abort(response()->json([
                    'message' => 'Không có bản sao nào của sách này đang ở trạng thái sửa chữa.'
                ], 422));
            }

            // Decrement repairing
            $book->repairing_quantity = max(0, $book->repairing_quantity - 1);
            $book->save();

            // Trigger reservations queue check to release or assign to next student
            \App\Http\Controllers\BorrowController::processNextInQueue($book->book_id);

            \App\Services\AuditLoggerService::log(
                'book_repair_complete',
                'Hoàn tất sửa chữa 1 bản sao sách: ' . $book->title . ' (ID: ' . $book->book_id . ')',
                $librarian
            );

            return $book;
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
