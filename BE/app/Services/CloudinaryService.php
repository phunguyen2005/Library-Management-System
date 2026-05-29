<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class CloudinaryService
{
    protected ?string $cloudName = null;
    protected ?string $apiKey = null;
    protected ?string $apiSecret = null;

    public function __construct()
    {
        $this->cloudName = config('services.cloudinary.cloud_name');
        $this->apiKey = config('services.cloudinary.api_key');
        $this->apiSecret = config('services.cloudinary.api_secret');

        if (empty($this->cloudName) || empty($this->apiKey) || empty($this->apiSecret)) {
            throw new \Exception('Chưa cấu hình thông tin kết nối Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) trong file .env của máy chủ.');
        }
    }

    /**
     * Xác định resource type của Cloudinary dựa vào extension.
     */
    public function getResourceType(string $extension): string
    {
        $extension = strtolower($extension);
        if (in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])) {
            return 'image';
        }
        if (in_array($extension, ['mp3', 'wav', 'm4a'])) {
            return 'video';
        }
        return 'raw';
    }

    /**
     * Upload file lên Cloudinary thông qua HTTP API.
     */
    public function upload(UploadedFile $file, string $folder = 'library_digital_files'): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $resourceType = $this->getResourceType($extension);
        
        $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $cleanName = Str::slug($originalName) ?: 'document';
        $publicId = $folder . '/' . time() . '_' . $cleanName;
        $timestamp = time();

        // Tạo signature cho request upload bảo mật theo yêu cầu của Cloudinary
        // Các tham số cần ký phải được sắp xếp theo thứ tự bảng chữ cái alphabet
        $paramsToSign = [
            'public_id' => $publicId,
            'timestamp' => $timestamp,
        ];
        $signature = $this->generateSignature($paramsToSign);

        // Sử dụng stream fopen nếu là file thật, hoặc chuỗi raw content nếu là file fake của unit test
        $realPath = $file->getRealPath();
        $fileHandle = ($realPath && file_exists($realPath)) 
            ? fopen($realPath, 'r') 
            : $file->getContent();

        // Chuẩn bị request tải lên
        $response = Http::asMultipart()
            ->attach('file', $fileHandle, $file->getClientOriginalName())
            ->post("https://api.cloudinary.com/v1_1/{$this->cloudName}/{$resourceType}/upload", [
                'public_id' => $publicId,
                'timestamp' => $timestamp,
                'api_key' => $this->apiKey,
                'signature' => $signature,
            ]);

        if ($response->failed()) {
            throw new \Exception('Cloudinary Upload API Error: ' . ($response->json('error.message') ?: $response->body()));
        }

        return [
            'secure_url' => $response->json('secure_url'),
            'public_id' => $response->json('public_id'),
        ];
    }

    /**
     * Xóa một file trên Cloudinary bằng public_id qua HTTP API.
     */
    public function delete(?string $publicId, string $extension): bool
    {
        if (empty($publicId)) {
            return false;
        }

        try {
            $resourceType = $this->getResourceType($extension);
            $timestamp = time();

            $paramsToSign = [
                'public_id' => $publicId,
                'timestamp' => $timestamp,
            ];
            $signature = $this->generateSignature($paramsToSign);

            $response = Http::post("https://api.cloudinary.com/v1_1/{$this->cloudName}/{$resourceType}/destroy", [
                'public_id' => $publicId,
                'timestamp' => $timestamp,
                'api_key' => $this->apiKey,
                'signature' => $signature,
            ]);

            return $response->successful() && $response->json('result') === 'ok';
        } catch (\Exception $e) {
            \Log::error("Cloudinary deletion failed via HTTP for ID {$publicId}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Sinh signature bảo mật bằng SHA-1.
     */
    private function generateSignature(array $params): string
    {
        ksort($params);
        $signatureString = '';
        foreach ($params as $key => $value) {
            $signatureString .= "{$key}={$value}&";
        }
        $signatureString = rtrim($signatureString, '&') . $this->apiSecret;
        
        return sha1($signatureString);
    }
}
