<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * DocumentStorageService — Supabase Storage (S3-compatible).
 *
 * Dùng cho digital files (PDF, EPUB). Audio và image vẫn dùng CloudinaryService.
 * Supabase free tier: 1 GB storage + 2 GB bandwidth/tháng.
 */
class DocumentStorageService
{
    private const DISK = 'supabase';
    private const FOLDER = 'library_documents';

    /**
     * Kiểm tra Supabase disk có sẵn sàng dùng không.
     *
     * Trả về true nếu:
     * - Credentials Supabase đầy đủ và endpoint hợp lệ (production), HOẶC
     * - Disk đang được fake bằng Storage::fake('supabase') trong test environment
     */
    public static function isConfigured(): bool
    {
        // Detect test fakes: Storage::fake('supabase') uses a local/memory adapter
        try {
            $adapter = Storage::disk(self::DISK)->getAdapter();
            if ($adapter instanceof \League\Flysystem\Local\LocalFilesystemAdapter) {
                return true;
            }
        } catch (\Throwable) {
            // Disk not resolvable → fall through to credential check
        }

        return ! empty(config('filesystems.disks.supabase.key'))
            && ! empty(config('filesystems.disks.supabase.secret'))
            && ! empty(config('filesystems.disks.supabase.bucket'))
            && ! empty(config('filesystems.disks.supabase.endpoint'))
            && ! str_contains((string) config('filesystems.disks.supabase.endpoint'), '<project-ref>');
    }

    /**
     * Upload file lên Supabase Storage.
     *
     * @param  UploadedFile  $file
     * @param  string  $folder  Sub-folder trong bucket (default: library_documents)
     * @return array{path: string, size: int}
     *
     * @throws \Exception nếu upload thất bại
     */
    public function upload(UploadedFile $file, string $folder = self::FOLDER): array
    {
        $extension  = strtolower($file->getClientOriginalExtension());
        $baseName   = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $cleanName  = Str::slug($baseName) ?: 'document';
        $objectKey  = $folder . '/' . time() . '_' . $cleanName . '.' . $extension;

        $disk = Storage::disk(self::DISK);

        $stored = $disk->put(
            $objectKey,
            file_get_contents($file->getRealPath()),
            'private'
        );

        if (! $stored) {
            throw new \Exception('Supabase storage upload failed: Storage::put() returned false for key: ' . $objectKey);
        }

        return [
            'path' => $objectKey,
            'size' => $file->getSize(),
        ];
    }

    /**
     * Xóa file khỏi Supabase Storage.
     *
     * @param  string  $path  Object key (ví dụ: library_documents/123_book.pdf)
     * @return bool
     */
    public function delete(string $path): bool
    {
        try {
            return Storage::disk(self::DISK)->delete($path);
        } catch (\Throwable $e) {
            \Log::error("Supabase storage deletion failed for path [{$path}]: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Tạo pre-signed URL có thời hạn để serve file an toàn.
     *
     * @param  string  $path     Object key trong Supabase Storage
     * @param  int     $minutes  Thời hạn URL (phút), default 60
     * @return string  Pre-signed URL
     *
     * @throws \Exception nếu không tạo được URL
     */
    public function temporaryUrl(string $path, int $minutes = 60): string
    {
        return Storage::disk(self::DISK)->temporaryUrl(
            $path,
            now()->addMinutes($minutes)
        );
    }

    /**
     * Kiểm tra file có tồn tại trong Supabase Storage không.
     */
    public function exists(string $path): bool
    {
        try {
            return Storage::disk(self::DISK)->exists($path);
        } catch (\Throwable $e) {
            return false;
        }
    }
}
